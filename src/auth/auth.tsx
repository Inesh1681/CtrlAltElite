import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { describeFirebaseError, FIREBASE_CONFIGURED, firebaseSignOut, signInWithGoogle, watchFirebaseUser } from './firebase'

/**
 * FLOWSHIELD authentication.
 *
 * Two providers behind one context:
 *  - Google sign-in via Firebase (when VITE_FIREBASE_* is set) — real accounts.
 *  - A shared operator access code (always available) — zero-setup fallback so the
 *    demo can never lock anyone out.
 *
 * Roles control what the UI lets you change. With Google sign-in the role comes from
 * email allow-lists (VITE_COMMANDER_EMAILS / VITE_VIEWER_EMAILS, comma separated);
 * everyone else is an operator. With the access code the user picks a role.
 */

export type Role = 'commander' | 'operator' | 'viewer'
export type AuthMethod = 'google' | 'access-code'

export interface User {
  name: string
  email: string
  role: Role
  method: AuthMethod
  photoUrl?: string
  signedInAt: number
}

export const ROLE_LABEL: Record<Role, string> = {
  commander: 'Incident Commander',
  operator: 'Flood Operator',
  viewer: 'Observer',
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  commander: 'Full control: scenarios, drainage interventions, demo.',
  operator: 'Run simulations and interventions.',
  viewer: 'Read-only: watch the simulation and alerts.',
}

/** what each role may do */
export const CAN = {
  changeScenario: (r: Role) => r !== 'viewer',
  changeParams: (r: Role) => r !== 'viewer',
  runDemo: (r: Role) => r !== 'viewer',
  commandCenter: (r: Role) => r === 'commander' || r === 'operator',
}

export interface SignInInput {
  name: string
  email: string
  accessCode: string
  role: Role
}

const STORAGE_KEY = 'flowshield.session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/** Access code from env (VITE_ACCESS_CODE); falls back to a demo code so the app never locks anyone out. */
export const ACCESS_CODE: string = (import.meta.env.VITE_ACCESS_CODE as string | undefined) || 'flowshield'
export const SHOW_DEMO_HINT = (import.meta.env.VITE_SHOW_DEMO_HINT as string | undefined) !== 'false'
export const GOOGLE_ENABLED = FIREBASE_CONFIGURED

function emailList(v: string | undefined): Set<string> {
  return new Set(
    (v ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  )
}
const COMMANDERS = emailList(import.meta.env.VITE_COMMANDER_EMAILS as string | undefined)
const VIEWERS = emailList(import.meta.env.VITE_VIEWER_EMAILS as string | undefined)

/** role for a Google account: allow-lists first, otherwise operator */
export function roleForEmail(email: string): Role {
  const e = email.toLowerCase()
  if (COMMANDERS.has(e)) return 'commander'
  if (VIEWERS.has(e)) return 'viewer'
  return 'operator'
}

// ---------------------------------------------------------------------------
// access-code provider (localStorage session)
// ---------------------------------------------------------------------------

function restoreSession(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as User
    if (!u || typeof u.signedInAt !== 'number' || Date.now() - u.signedInAt > SESSION_TTL_MS) return null
    if (!['commander', 'operator', 'viewer'].includes(u.role)) return null
    if (u.method !== 'access-code') return null // Google sessions are restored by Firebase itself
    return u
  } catch {
    return null
  }
}

function storeSession(u: User | null) {
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode */
  }
}

async function accessCodeSignIn({ name, email, accessCode, role }: SignInInput): Promise<User> {
  await new Promise((r) => setTimeout(r, 350)) // small delay so the button state reads as a real request
  if (!name.trim()) throw new Error('Enter your name.')
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.')
  if (accessCode.trim() !== ACCESS_CODE) throw new Error('Access code not recognised.')
  const user: User = { name: name.trim(), email: email.trim().toLowerCase(), role, method: 'access-code', signedInAt: Date.now() }
  storeSession(user)
  return user
}

// ---------------------------------------------------------------------------
// context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null
  role: Role
  /** true while Firebase is still restoring a previous Google session */
  loading: boolean
  googleEnabled: boolean
  signIn: (input: SignInInput) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [codeUser, setCodeUser] = useState<User | null>(() => restoreSession())
  const [googleUser, setGoogleUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(GOOGLE_ENABLED)

  // Firebase restores Google sessions itself; mirror them into React state
  useEffect(() => {
    return watchFirebaseUser((fu) => {
      if (fu && fu.email) {
        setGoogleUser({
          name: fu.displayName || fu.email.split('@')[0],
          email: fu.email,
          role: roleForEmail(fu.email),
          method: 'google',
          photoUrl: fu.photoURL ?? undefined,
          signedInAt: Date.now(),
        })
      } else {
        setGoogleUser(null)
      }
      setLoading(false)
    })
  }, [])

  // keep multiple tabs in sync for access-code sessions
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCodeUser(restoreSession())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const signIn = useCallback(async (input: SignInInput) => {
    setCodeUser(await accessCodeSignIn(input))
  }, [])

  const signInGoogle = useCallback(async () => {
    try {
      await signInWithGoogle() // onAuthStateChanged populates googleUser
    } catch (err) {
      throw new Error(describeFirebaseError(err))
    }
  }, [])

  const signOut = useCallback(async () => {
    storeSession(null)
    setCodeUser(null)
    if (GOOGLE_ENABLED) await firebaseSignOut()
  }, [])

  const user = googleUser ?? codeUser
  const value = useMemo<AuthContextValue>(
    () => ({ user, role: user?.role ?? 'viewer', loading, googleEnabled: GOOGLE_ENABLED, signIn, signInGoogle, signOut }),
    [user, loading, signIn, signInGoogle, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
