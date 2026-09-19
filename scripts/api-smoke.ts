import handler from '../api/explain'
import { PassThrough } from 'node:stream'
const body = JSON.stringify({ simTime: 'T+00:00', scenario: 'TEST' })
const req = () => new Request('http://x/api/explain', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' }, body })
handler(req()).then(async (r) => console.log('POST', r.status, await r.text()))
// Node-style signature (what Vercel's Node runtime uses)
const nodeReq = Object.assign(new PassThrough(), { method: 'GET', url: '/api/explain', headers: { host: 'x' } })
const nodeRes = { statusCode: 0, headers: {} as Record<string, string>, setHeader(k: string, v: string) { this.headers[k] = v }, end(b?: Buffer) { console.log('NODE', this.statusCode, b?.toString()) } }
void handler(nodeReq as never, nodeRes)
nodeReq.end()
