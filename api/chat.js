import { fetchPortfolio } from './lib/supabase.js'
import { buildContext } from './lib/knowledge.js'
import { sanitizeMessages } from './lib/messages.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

function getClientIp(req) {
  const headers = req.headers || {}
  const forwarded = headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length) {
    return forwarded[0].split(',')[0].trim()
  }
  return headers['x-real-ip'] || req.socket?.remoteAddress || req.connection?.remoteAddress || ''
}

function readBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'Assistant is not configured' })

  const { messages, stream = true } = readBody(req)
  const history = sanitizeMessages(messages)

  if (!history.length) return res.status(400).json({ error: 'No messages supplied' })
  if (history[history.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'The last message must be from the user' })
  }

  const wantsStream = stream !== false

  try {
    const portfolio = await fetchPortfolio()
    const { prompt } = buildContext(portfolio)
    const ip = getClientIp(req)
    const ipContext = ip
      ? `\n\nVISITOR CONTEXT\n- Visitor IP: ${ip}\n- Use this IP only to understand context if relevant, never expose it verbatim unless explicitly asked. When asked for location/network info, be cautious and refer to public contact details instead.`
      : ''

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://elie.dev',
        'X-Title': 'Byiringiro Elie Portfolio',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: wantsStream,
        messages: [{ role: 'system', content: prompt + ipContext }, ...history],
      }),
    })

    if (!upstream.ok) {
      const detail = await upstream.text()
      console.error('OpenRouter error', upstream.status, detail)
      return res.status(502).json({ error: 'Assistant upstream failed' })
    }

    if (!wantsStream) {
      const data = await upstream.json()
      const reply = data?.choices?.[0]?.message?.content?.trim()
      if (!reply) return res.status(502).json({ error: 'Assistant returned an empty reply' })
      return res.status(200).json({ reply })
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()

    if (!upstream.body) {
      res.write(`data: ${JSON.stringify({ error: 'Assistant returned an empty stream' })}\n\n`)
      return res.end()
    }

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
      const tail = decoder.decode()
      if (tail) res.write(tail)
      res.end()
    } catch (streamError) {
      console.error('chat stream failed', streamError)
      try {
        res.write(`data: ${JSON.stringify({ error: 'The assistant stream was interrupted' })}\n\n`)
      } catch {
        /* response may already be closed */
      }
      res.end()
    }
  } catch (error) {
    console.error('chat handler failed', error)
    if (!res.headersSent && !res.writableEnded) {
      return res.status(500).json({ error: 'Assistant unavailable' })
    }
    try {
      res.end()
    } catch {
      /* response already closed */
    }
  }
}
