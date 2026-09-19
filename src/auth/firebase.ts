import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type Auth, type User as FirebaseUser } from 'firebase/auth'

/**
 * Firebase (Google sign-in). Active only when VITE_FIREBASE_* is configured;
 * otherwise the app silently falls back to the access-code gate.
 */

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const FIREBASE_CONFIGURED = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)

let app: FirebaseApp | null = null
let auth: Auth | null = null

function getFirebaseAuth(): Auth | null {
  if (!FIREBASE_CONFIGURED) return null
  if (!auth) {
    app = initializeApp({ apiKey: cfg.apiKey!, authDomain: cfg.authDomain!, projectId: cfg.projectId!, appId: cfg.appId! })
    auth = getAuth(app)
  }
  return auth
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const a = getFirebaseAuth()
  if (!a) throw new Error('Firebase is not configured.')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(a, provider)
  return result.user
}

export async function firebaseSignOut(): Promise<void> {
  const a = getFirebaseAuth()
  if (a) await fbSignOut(a)
}

/** Subscribe to Firebase auth state. Returns an unsubscribe; no-op when not configured. */
export function watchFirebaseUser(cb: (u: FirebaseUser | null) => void): () => void {
  const a = getFirebaseAuth()
  if (!a) return () => undefined
  return onAuthStateChanged(a, cb)
}

/** Friendly message for the common popup errors. */
export function describeFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in window was closed.'
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in popup — allow popups for this site and try again.'
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorised in Firebase → Authentication → Settings → Authorized domains.'
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is not enabled in Firebase → Authentication → Sign-in method.'
  if (code === 'auth/network-request-failed') return 'Network error — check your connection, or use the access code.'
  return err instanceof Error ? err.message : 'Google sign-in failed.'
}
