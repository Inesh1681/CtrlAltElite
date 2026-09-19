import { profileFromHourly } from '../simulation/scenarios'
import type { RainfallProfile } from '../simulation/types'

export interface WeatherLocation {
  name: string
  lat: number
  lon: number
}

export const WEATHER_LOCATIONS: WeatherLocation[] = [
  { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
]

export interface WeatherResult {
  profile: RainfallProfile
  hourly: number[]
  times: string[]
  peak: number
  total: number
}

/**
 * Fetch the next `hours` of hourly precipitation from Open-Meteo (no API key needed)
 * and turn it into a rainfall profile the engine can consume.
 */
export async function fetchPrecipitationForecast(loc: WeatherLocation, hours = 12, signal?: AbortSignal): Promise<WeatherResult> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(loc.lat))
  url.searchParams.set('longitude', String(loc.lon))
  url.searchParams.set('hourly', 'precipitation')
  url.searchParams.set('forecast_days', '2')
  url.searchParams.set('timezone', 'auto')
  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const json = (await res.json()) as { hourly?: { time: string[]; precipitation: (number | null)[] } }
  const times = json.hourly?.time ?? []
  const precip = json.hourly?.precipitation ?? []
  // start from the current hour
  const now = new Date()
  let start = times.findIndex((t) => new Date(t) >= now)
  if (start < 0) start = 0
  const hourly = precip.slice(start, start + hours).map((v) => (typeof v === 'number' ? v : 0))
  const slicedTimes = times.slice(start, start + hours)
  return {
    profile: profileFromHourly(hourly, `LIVE · ${loc.name.toUpperCase()}`),
    hourly,
    times: slicedTimes,
    peak: Math.max(0, ...hourly),
    total: hourly.reduce((a, b) => a + b, 0),
  }
}
