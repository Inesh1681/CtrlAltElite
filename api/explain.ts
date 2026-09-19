import Anthropic from '@anthropic-ai/sdk'

/**
 * Vercel serverless function: POST /api/explain
 *
 * Receives the structured simulation snapshot from the browser and asks Claude to
 * interpret it. The API key lives only here (ANTHROPIC_API_KEY, server-side), never
 * in the client bundle. Also serves GET /api/explain → { enabled } so the UI knows
 * whether Claude is available.
 *
 * Cost guards: identical snapshots are served from an in-memory cache, each
 * instance allows a bounded number of calls per IP per hour, output is capped.
 */

const MODEL = 'claude-opus-5'
const MAX_TOKENS = 900
const RATE_LIMIT_PER_HOUR = 40
const MAX_BODY_BYTES = 64 * 1024

const SYSTEM = `You are the analyst inside FLOWSHIELD, a flood early-warning command centre.
You receive a JSON snapshot produced by a deterministic flood simulation. That snapshot is the only source of truth.
Rules:
- Never invent, estimate or round differently any number that is not in the snapshot. Quote values exactly as given.
- Do not speculate about zones or data that are not present.
- Be concise and operational: plain sentences, no markdown headings other than the four uppercase section labels below, no bullet symbols other than "•".
Respond with exactly these sections, each on its own lines:
SITUATION — one or two sentences on the city-wide picture.
WHY <ZONE> IS <LEVEL> — explain the focus zone (or the top-risk zone if none) using its factors and numbers.
RECOMMENDED INTERVENTIONS — 2 to 3 bullets; if a what-if comparison is present, state its delay explicitly.
MONITOR — the zones that should be watched next and why, one line.`

// per-instance state (serverless instances are recycled, which is fine for a demo)
const cache = new Map<string, { text: string; at: number }>()
const hits = new Map<string, { count: number; windowStart: number }>()

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })
}

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now - rec.windowStart > 3_600_000) {
    hits.set(ip, { count: 1, windowStart: now })
    return false
  }
  rec.count++
  return rec.count > RATE_LIMIT_PER_HOUR
}

/** Core handler on the Web standard Request/Response API. */
export async function handle(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const enabled = Boolean(apiKey)

  if (request.method === 'GET') return json({ enabled, model: enabled ? MODEL : null })
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' })
  if (!enabled) return json({ error: 'AI explanations are not configured on this deployment.' }, 503)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return json({ error: 'Rate limit reached — the rule-based analyst is still available.' }, 429)

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return json({ error: 'unreadable body' }, 400)
  }
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'snapshot too large' }, 413)

  let snapshot: unknown
  try {
    snapshot = JSON.parse(raw)
  } catch {
    return json({ error: 'body must be JSON' }, 400)
  }
  if (!snapshot || typeof snapshot !== 'object' || !('simTime' in snapshot)) return json({ error: 'not a simulation snapshot' }, 400)

  const key = hash(raw)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < 3_600_000) return json({ text: cached.text, cached: true })

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 })
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: `Simulation snapshot:\n${JSON.stringify(snapshot, null, 1)}` }],
    })
    if (response.stop_reason === 'refusal') return json({ error: 'The model declined to answer.' }, 502)
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    if (!text) return json({ error: 'empty response' }, 502)
    cache.set(key, { text, at: Date.now() })
    if (cache.size > 200) cache.delete(cache.keys().next().value!)
    return json({ text, cached: false })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Upstream rate limit.' }, 429)
    if (err instanceof Anthropic.AuthenticationError) return json({ error: 'Invalid API key on the server.' }, 500)
    if (err instanceof Anthropic.APIError) return json({ error: `Claude API error ${err.status}` }, 502)
    return json({ error: 'AI explanation failed.' }, 500)
  }
}

// ---------------------------------------------------------------------------
// Vercel entry point. Supports both the Web signature (request) and the
// Node.js signature (req, res) so it works whichever the runtime picks.
// ---------------------------------------------------------------------------

interface NodeReq {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  on: (ev: string, cb: (chunk?: Buffer) => void) => void
}
interface NodeRes {
  statusCode: number
  setHeader: (k: string, v: string) => void
  end: (body?: Buffer) => void
}

export default async function handler(reqOrRequest: Request | NodeReq, res?: NodeRes): Promise<Response | void> {
  if (!res || typeof res.setHeader !== 'function') return handle(reqOrRequest as Request)

  const req = reqOrRequest as NodeReq
  const body = await new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => c && chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
  const headers: [string, string][] = []
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.push([k, v])
  const method = req.method ?? 'GET'
  const request = new Request(`https://flowshield.local${req.url ?? '/api/explain'}`, {
    method,
    headers,
    body: method === 'POST' ? new Uint8Array(body) : undefined,
  })
  const response = await handle(request)
  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(Buffer.from(await response.arrayBuffer()))
}
