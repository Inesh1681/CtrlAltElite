import { generateCity } from '../src/simulation/city'
import { createInitialState, step, DEFAULT_PARAMS, formatSimTime } from '../src/simulation/engine'
import { SCENARIOS } from '../src/simulation/scenarios'
import { computeRisk } from '../src/simulation/risk'
import { forecast } from '../src/simulation/forecast'

const city = generateCity()
console.log('elev range', Math.min(...city.map(z=>z.elevation)), Math.max(...city.map(z=>z.elevation)))
console.log('drain range', Math.min(...city.map(z=>z.drainageCapacity)), Math.max(...city.map(z=>z.drainageCapacity)))
for (let r=0;r<6;r++) console.log(city.slice(r*8,r*8+8).map(z=>String(z.elevation).padStart(5)).join(' '))
for (const sc of SCENARIOS) {
  let s = createInitialState(city)
  console.log('\n==', sc.name)
  for (let t=0;t<48;t++) {
    s = step(s, DEFAULT_PARAMS, sc)
    if (s.tick % 6 === 0) {
      const counts: Record<string, number> = {}
      for (const z of s.zones) { const l = computeRisk(z).level; counts[l]=(counts[l]??0)+1 }
      const snap = s.history[s.history.length-1]
      console.log(formatSimTime(s.minutes), 'rain', snap.rainfall.toFixed(0), 'avg', snap.avgWater.toFixed(3), 'max', snap.maxWater.toFixed(3), 'util', snap.avgDrainageUtil.toFixed(2), JSON.stringify(counts))
    }
  }
}
let s = createInitialState(city)
for (let t=0;t<6;t++) s = step(s, DEFAULT_PARAMS, SCENARIOS[1])
const fc = forecast(s, DEFAULT_PARAMS, SCENARIOS[1])
console.log('first critical', fc.firstCritical, 'critAtHorizon', fc.peakCritical)
const fc2 = forecast(s, {...DEFAULT_PARAMS, drainageMultiplier: 1.2}, SCENARIOS[1])
console.log('with +20%', fc2.firstCritical, fc2.peakCritical)
