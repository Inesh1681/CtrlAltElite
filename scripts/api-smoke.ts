import handler from '../api/explain'
const body = JSON.stringify({ simTime: 'T+00:00', scenario: 'TEST' })
const req = () => new Request('http://x/api/explain', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' }, body })
handler(req()).then(async (r) => console.log('POST', r.status, await r.text()))
