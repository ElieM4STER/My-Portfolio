import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the api/ functions locally so `npm run dev` matches production behaviour.
// In production these functions run on the host (Vercel, Netlify) instead.
const API_ROUTES = {
  '/api/chat': '/api/chat.js',
  '/api/admin': '/api/admin.js',
  '/api/contact': '/api/contact.js',
  '/api/visits': '/api/visits.js',
}

function apiDevServer() {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    async configureServer(server) {
      const env = loadEnv('development', server.config.root, '')
      const handlers = {}

      const getHandler = async modulePath => {
        if (!handlers[modulePath]) {
          handlers[modulePath] = (await server.ssrLoadModule(modulePath)).default
        }
        return handlers[modulePath]
      }

      const shimResponse = res => ({
        statusCode: 200,
        headers: {},
        get headersSent() {
          return res.headersSent
        },
        get writableEnded() {
          return res.writableEnded
        },
        setHeader(name, value) {
          this.headers[name] = value
          res.setHeader(name, value)
        },
        status(code) {
          this.statusCode = code
          res.statusCode = code
          return this
        },
        flushHeaders() {
          if (typeof res.flushHeaders === 'function') res.flushHeaders()
        },
        write(chunk) {
          return res.write(chunk)
        },
        json(payload) {
          if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
          return this
        },
        end(chunk) {
          res.end(chunk)
          return this
        },
      })

      for (const [route, modulePath] of Object.entries(API_ROUTES)) {
        server.middlewares.use(route, async (req, res) => {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          let body = {}
          try {
            body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid JSON body' }))
            return
          }

          Object.assign(process.env, env)

          try {
            const handler = await getHandler(modulePath)
            await handler({ method: req.method, headers: req.headers, body }, shimResponse(res))
          } catch (error) {
            server.config.logger.error(String(error))
            if (!res.writableEnded) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Function unavailable' }))
            }
          }
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), apiDevServer()],
})
