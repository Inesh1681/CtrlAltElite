import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * FLOWSHIELD authentication.
 *
 * The app is a static SPA with no backend, so "auth" here is an operator gate:
 * a name + shared access code, with a role that controls what the UI lets you
 * change. The session is kept in localStorage for 12 h.
 *
 * The provider is isolated behind `AuthProvider` so a real identity service
 * (Firebase / Supabase / Clerk) can replace `accessCodeProvider` without
 * touching the UI.
 */

export type Role = 'commander' | 'operator' | 'viewer'

export interface User {
  name: string
  email: string
  role: Role
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

interface AuthProviderImpl {
  signIn: (input: SignInInput) => Promise<User>
  restore: () => User | null
  signOut: () => void
}

const STORAGE_KEY = 'flowshield.session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/** Access code from env (VITE_ACCESS_CODE); falls back to a demo code so the app never locks anyone out. */
export const ACCESS_CODE: string = (import.meta.env.VITE_ACCESS_CODE as string | undefined) || 'flowshield'
export const SHOW_DEMO_HINT = (import.meta.env.VITE_SHOW_DEMO_HINT as string | undefined) !== 'false'

const accessCodeProvider: AuthProviderImpl = {
  async signIn({ name, email, accessCode, role }) {
    await new Promise((r) => setTimeout(r, 350)) // small delay so the button state reads as a real request
    if (!name.trim()) throw new Error('Enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.')
    if (accessCode.trim() !== ACCESS_CODE) throw new Error('Access code not recognised.')
    const user: User = { name: name.trim(), email: email.trim().toLowerCase(), role, signedInAt: Date.now() }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } catch {
      /* private mode */
    }
    return user
  },
  restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const u = JSON.parse(raw) as User
      if (!u || typeof u.signedInAt !== 'number' || Date.now() - u.signedInAt > SESSION_TTL_MS) return null
      if (!['commander', 'operator', 'viewer'].includes(u.role)) return null
      return u
    } catch {
      return null
    }
  },
  signOut() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },
}

interface AuthContextValue {
  user: User | null
  role: Role
  signIn: (input: SignInInput) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => accessCodeProvider.restore())

  // keep multiple tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUser(accessCodeProvider.restore())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const signIn = useCallback(async (input: SignInInput) => {
    const u = await accessCodeProvider.signIn(input)
    setUser(u)
  }, [])
  const signOut = useCallback(() => {
    accessCodeProvider.signOut()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ user, role: user?.role ?? 'viewer', signIn, signOut }), [user, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
