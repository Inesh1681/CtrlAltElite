import { generateCity } from '../src/simulation/city'
import { createInitialState, step, DEFAULT_PARAMS, formatSimTime } from '../src/simulation/engine'
import { UPSTREAM_SURGE } from '../src/simulation/scenarios'
import { computeRisk } from '../src/simulation/risk'
const city = generateCity()
console.log('inlets', city.filter(z=>z.isInlet).map(z=>`${z.id} ${z.name} ${z.elevation}m`))
let s = createInitialState(city)
for (let t=0;t<72;t++) {
  s = step(s, DEFAULT_PARAMS, UPSTREAM_SURGE)
  if (s.tick % 6 === 0) {
    const counts: Record<string, number> = {}
    const hot: string[] = []
    for (const z of s.zones) { const l = computeRisk(z).level; counts[l]=(counts[l]??0)+1; if (l==='FLOODED'||l==='CRITICAL') hot.push(z.name) }
    console.log(formatSimTime(s.minutes), JSON.stringify(counts), hot.join(', '))
  }
}
