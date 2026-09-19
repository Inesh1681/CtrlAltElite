import { useState, type FormEvent } from 'react'
import { ACCESS_CODE, ROLE_DESCRIPTION, ROLE_LABEL, SHOW_DEMO_HINT, useAuth, type Role } from '../auth/auth'
import { Logo } from './Landing'

export function Login({ onBack }: { onBack: () => void }) {
  const { signIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<Role>('operator')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn({ name, email, accessCode: code, role })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const roles: Role[] = ['commander', 'operator', 'viewer']

  return (
    <div className="scanline flex h-full items-center justify-center overflow-y-auto bg-bg px-4 text-text">
      <div className="w-full max-w-[420px] py-8">
        <button className="mb-6 flex items-center gap-2 text-muted hover:text-text" onClick={onBack}>
          <Logo />
          <span className="text-[14px] font-semibold tracking-[0.18em] text-text">FLOWSHIELD</span>
          <span className="label ml-1">Operator access</span>
        </button>

        <form onSubmit={submit} className="panel p-5">
          <div className="text-[17px] font-semibold">Sign in to the command centre</div>
          <div className="mt-1 text-[12px] text-muted">Sessions last 12 hours on this device.</div>

          <label className="mt-5 block">
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

          {error && <div className="mt-4 rounded border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical">{error}</div>}

          <button type="submit" className="btn btn-primary mt-5 h-10 w-full justify-center text-[12px]" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in →'}
          </button>

          {SHOW_DEMO_HINT && (
            <div className="mt-4 rounded border border-line bg-panel-2 px-3 py-2 text-[11px] text-muted">
              Hackathon demo access code: <span className="mono text-water">{ACCESS_CODE}</span>
            </div>
          )}
        </form>

        <div className="mt-4 text-center text-[10px] text-dim">Access is a shared operator code for the demo. Wire a real identity provider via src/auth/auth.tsx.</div>
      </div>
    </div>
  )
}
