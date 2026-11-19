import { insertRow } from './lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { visitor = '', path = '/', referrer = '' } = req.body || {}
  if (!visitor) return res.status(400).json({ error: 'Missing visitor id' })

  const ok = await insertRow('visits', {
    visitor: String(visitor).slice(0, 64),
    path: String(path).slice(0, 200),
    referrer: String(referrer).slice(0, 300),
  })

  if (!ok) return res.status(502).json({ error: 'Analytics are not connected' })
  return res.status(200).json({ ok: true })
}