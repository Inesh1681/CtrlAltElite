import { useEffect, useState } from 'react'
import { CommandCenter } from './components/CommandCenter'
import { Operations } from './components/Operations'
import { TopBar, type ViewMode } from './components/TopBar'
import { useSimulation } from './hooks/useSimulation'

export default function App() {
  const sim = useSimulation()
  const [mode, setMode] = useState<ViewMode>('ops')

  // keyboard: space = play/pause, R = reset, N = step, D = demo, C/O = views
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return
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
  }, [sim])

  return (
    <div className="scanline flex h-full min-w-[1180px] flex-col bg-bg text-text">
      <TopBar sim={sim} mode={mode} setMode={setMode} />
      <main className="min-h-0 flex-1">{mode === 'command' ? <CommandCenter sim={sim} /> : <Operations sim={sim} />}</main>
    </div>
  )
}
