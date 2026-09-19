import { useEffect, useState } from 'react'
import { CommandCenter } from './components/CommandCenter'
import { Landing } from './components/Landing'
import { Operations } from './components/Operations'
import { TopBar, type ViewMode } from './components/TopBar'
import { useSimulation } from './hooks/useSimulation'

type Route = 'landing' | 'app'

function routeFromHash(): Route {
  const h = window.location.hash
  return h === '#app' || h === '#demo' || h === '#command' ? 'app' : 'landing'
}

export default function App() {
  const sim = useSimulation()
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [mode, setMode] = useState<ViewMode>(() => (window.location.hash === '#command' ? 'command' : 'ops'))

  // hash routing: "" → landing, #app → dashboard, #demo → dashboard + demo, #command → command center
  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash())
      if (window.location.hash === '#command') setMode('command')
      if (window.location.hash === '#demo') sim.runDemo()
    }
    window.addEventListener('hashchange', onHash)
    if (window.location.hash === '#demo') sim.runDemo()
    return () => window.removeEventListener('hashchange', onHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goHome = () => {
    sim.pause()
    window.location.hash = ''
  }

  // keyboard: space = play/pause, R = reset, N = step, D = demo, C/O = views (dashboard only)
  useEffect(() => {
    if (route !== 'app') return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        sim.toggle()
      } else if (e.key === 'r') sim.reset()
      else if (e.key === 'n') sim.stepOnce()
      else if (e.key === 'd') sim.runDemo()
      else if (e.key === 'c') setMode('command')
      else if (e.key === 'o') setMode('ops')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sim, route])

  if (route === 'landing') {
    return (
      <Landing
        onOpen={() => {
          window.location.hash = '#app'
        }}
        onDemo={() => {
          window.location.hash = '#demo'
        }}
      />
    )
  }

  return (
    <div className="scanline flex h-full min-w-[1180px] flex-col bg-bg text-text">
      <TopBar sim={sim} mode={mode} setMode={setMode} onHome={goHome} />
      <main className="min-h-0 flex-1">{mode === 'command' ? <CommandCenter sim={sim} /> : <Operations sim={sim} />}</main>
    </div>
  )
}
