import { useState, type FormEvent } from 'react'
import { ACCESS_CODE, ROLE_DESCRIPTION, ROLE_LABEL, SHOW_DEMO_HINT, useAuth, type Role } from '../auth/auth'
import { Logo } from './Landing'

export function Login({ onBack }: { onBack: () => void }) {
  const { signIn, signInGoogle, googleEnabled, loading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<Role>('operator')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'code' | 'google' | null>(null)
  const [showCode, setShowCode] = useState(!googleEnabled)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy('code')
    setError(null)
    try {
      await signIn({ name, email, accessCode: code, role })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(null)
    }
  }

  async function google() {
    setBusy('google')
    setError(null)
    try {
      await signInGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally {
      setBusy(null)
    }
  }

  const roles: Role[] = ['commander', 'operator', 'viewer']

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-muted">
        <span className="label">Restoring session…</span>
      </div>
    )
  }

  return (
    <div className="scanline flex h-full items-center justify-center overflow-y-auto bg-bg px-4 text-text">
      <div className="w-full max-w-[420px] py-8">
        <button className="mb-6 flex items-center gap-2 text-muted hover:text-text" onClick={onBack}>
          <Logo />
          <span className="text-[14px] font-semibold tracking-[0.18em] text-text">FLOWSHIELD</span>
          <span className="label ml-1">Operator access</span>
        </button>

        <div className="panel p-5">
          <div className="text-[17px] font-semibold">Sign in to the command centre</div>
          <div className="mt-1 text-[12px] text-muted">{googleEnabled ? 'Use your Google account, or an operator access code.' : 'Sessions last 12 hours on this device.'}</div>

          {googleEnabled && (
            <>
              <button type="button" className="btn mt-5 h-10 w-full justify-center gap-2 text-[12px]" onClick={google} disabled={busy !== null}>
                <GoogleMark />
                {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <div className="my-4 flex items-center gap-3 text-[10px] text-dim">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
              {!showCode && (
                <button type="button" className="btn h-9 w-full justify-center text-[11px]" onClick={() => setShowCode(true)}>
                  Use an access code instead
                </button>
              )}
            </>
          )}

          {showCode && (
            <form onSubmit={submit}>
              <label className={`block ${googleEnabled ? '' : 'mt-5'}`}>
                <span className="label">Name</span>
                <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="A. Sharma" autoComplete="name" required />
              </label>
              <label className="mt-3 block">
                <span className="label">Email</span>
                <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@city.gov.in" autoComplete="email" required />
              </label>
              <label className="mt-3 block">
                <span className="label">Access code</span>
                <input className="input mono mt-1" type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </label>

              <div className="mt-4">
                <span className="label">Role</span>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {roles.map((r) => (
                    <button type="button" key={r} className={`btn h-8 justify-center ${role === r ? 'btn-active' : ''}`} onClick={() => setRole(r)}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  <span className="text-text">{ROLE_LABEL[role]}</span> — {ROLE_DESCRIPTION[role]}
                </div>
              </div>

              <button type="submit" className="btn btn-primary mt-5 h-10 w-full justify-center text-[12px]" disabled={busy !== null}>
                {busy === 'code' ? 'Signing in…' : 'Sign in →'}
              </button>

              {SHOW_DEMO_HINT && (
                <div className="mt-4 rounded border border-line bg-panel-2 px-3 py-2 text-[11px] text-muted">
                  Hackathon demo access code: <span className="mono text-water">{ACCESS_CODE}</span>
                </div>
              )}
            </form>
          )}

          {error && <div className="mt-4 rounded border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical">{error}</div>}
        </div>

        <div className="mt-4 text-center text-[10px] text-dim">
          {googleEnabled
            ? 'Google accounts get the operator role unless listed in VITE_COMMANDER_EMAILS / VITE_VIEWER_EMAILS.'
            : 'Access is a shared operator code for the demo. Configure VITE_FIREBASE_* to enable Google sign-in.'}
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.9c-.3 2.2-1.7 5.4-4.9 7.6l7.5 5.8c4.5-4.1 7-10.2 7-17z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2 1.4-4.7 2.4-8.4 2.4-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}
