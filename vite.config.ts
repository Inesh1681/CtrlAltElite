import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Serve the Vercel function in api/explain.ts during `npm run dev`, so the analyst
 * works locally exactly as it does on Vercel. ANTHROPIC_API_KEY is read from .env.
 */
function apiDevPlugin(mode: string): Plugin {
  return {
    name: 'flowshield-api-dev',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '')
      if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
      server.middlewares.use('/api/explain', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/explain.ts')
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const url = `http://localhost${req.url ?? '/api/explain'}`
          const request = new Request(url, {
            method: req.method,
            headers: Object.entries(req.headers).filter(([, v]) => typeof v === 'string') as [string, string][],
            body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
          })
          const response: Response = await mod.default(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), apiDevPlugin(mode)],
}))
