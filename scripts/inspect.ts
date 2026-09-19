import { generateCity } from '../src/simulation/city'
import { createInitialState, step, DEFAULT_PARAMS } from '../src/simulation/engine'
import { SCENARIOS } from '../src/simulation/scenarios'
import { computeRisk } from '../src/simulation/risk'
const city = generateCity()
const sc = SCENARIOS[Number(process.argv[2] ?? 1)]
let s = createInitialState(city)
const ticks = Number(process.argv[3] ?? 24)
for (let t=0;t<ticks;t++) s = step(s, DEFAULT_PARAMS, sc)
for (const z of s.zones) {
  const r = computeRisk(z)
  if (r.level !== 'SAFE') console.log(z.id, z.name.padEnd(16), 'elev', z.elevation, 'water', z.waterLevel.toFixed(2), '/', z.floodThreshold, r.level, 'util', z.drainageUtilization.toFixed(2), 'in', z.inflow.toFixed(3), 'out', z.outflow.toFixed(3), 'cap', z.drainageCapacity, 'catch', z.catchmentFactor, z.landUse, 'nb', z.neighbors.map(n=>s.zones.find(q=>q.id===n)!.elevation).join('/'))
}
