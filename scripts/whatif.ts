import { generateCity } from '../src/simulation/city'
import { createInitialState, step, DEFAULT_PARAMS } from '../src/simulation/engine'
import { HEAVY_MONSOON } from '../src/simulation/scenarios'
import { forecast } from '../src/simulation/forecast'
import { compareDrainage } from '../src/simulation/whatif'
const city = generateCity()
for (const atTick of [0, 6, 12]) {
  let s = createInitialState(city)
  for (let t=0;t<atTick;t++) s = step(s, DEFAULT_PARAMS, HEAVY_MONSOON)
  const fc = forecast(s, DEFAULT_PARAMS, HEAVY_MONSOON)
  const soon = [...fc.byZone.entries()].filter(([,f])=>f.minutesToCritical>0 && isFinite(f.minutesToCritical)).sort((a,b)=>a[1].minutesToCritical-b[1].minutesToCritical).slice(0,5)
  console.log(`\n@tick ${atTick} (T+${atTick*5}m) critAtHorizon=${fc.peakCritical}`)
  for (const [id] of soon) {
    const r20 = compareDrainage(s, DEFAULT_PARAMS, HEAVY_MONSOON, id, 1.2)
    const r40 = compareDrainage(s, DEFAULT_PARAMS, HEAVY_MONSOON, id, 1.4)
    const r60 = compareDrainage(s, DEFAULT_PARAMS, HEAVY_MONSOON, id, 1.6)
    console.log(id, r20.zoneName.padEnd(16), 'base', r20.baselineMinutes, '+20%', r20.scenarioMinutes, '+40%', r40.scenarioMinutes, '+60%', r60.scenarioMinutes, 'critZones', r20.baselineCriticalZones, r20.scenarioCriticalZones, r40.scenarioCriticalZones, r60.scenarioCriticalZones)
  }
}
