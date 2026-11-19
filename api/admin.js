import crypto from 'node:crypto'
import {
  isServiceConfigured,
  serviceList,
  serviceUpsert,
  serviceDeleteRow,
  serviceInsert,
  serviceUpdate,
  signObject,
  deleteObject,
} from './lib/supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CONTENT_TABLES = ['projects', 'skills', 'testimonials', 'experience', 'posts', 'messages']
const ALLOWED_TABLES = [...CONTENT_TABLES, 'visits', 'recordings']
const NUMERIC_FIELDS = ['sort_order', 'percent', 'rating', 'duration', 'size']
const ARRAY_FIELDS = ['tags', 'roles']

function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a || '')).digest()
  const right = crypto.createHash('sha256').update(String(b || '')).digest()
  return crypto.timingSafeEqual(left, right)
}

function clean(data) {
  const out = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined || value === null) continue
    if (ARRAY_FIELDS.includes(key)) {
      out[key] = typeof value === 'string'
        ? value.split(',').map(part => part.trim()).filter(Boolean)
        : Array.isArray(value) ? value : []
    } else if (NUMERIC_FIELDS.includes(key)) {
      const num = Number(value)
      if (Number.isFinite(num)) out[key] = num
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    }
  }
  return out
}

async function getProfileRow() {
  const rows = (await serviceList('profile', '&limit=1')) || []
  return rows[0] || null
}

async function buildStats() {
  const count = rows => ({ total: rows.length })

  const [
    projects,
    skills,
    testimonials,
    experience,
    posts,
    messages,
    recordings,
    visits,
  ] = await Promise.all([
    serviceList('projects', '&order=sort_order.asc').catch(() => []),
    serviceList('skills', '&order=sort_order.asc').catch(() => []),
    serviceList('testimonials', '&order=sort_order.asc').catch(() => []),
    serviceList('experience', '&order=sort_order.asc').catch(() => []),
    serviceList('posts', '&order=sort_order.asc').catch(() => []),
    serviceList('messages', '&order=created_at.desc').catch(() => []),
    serviceList('recordings', '&order=created_at.desc').catch(() => []),
    serviceList('visits', '&order=created_at.desc').catch(() => []),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = ts => {
    const date = new Date(ts)
    return !Number.isNaN(date.getTime()) && date.getTime() >= today.getTime()
  }

  const unique = rows => new Set(rows.map(row => row.visitor || `${row.id}`)).size

  return {
    counts: {
      projects: count(projects).total,
      skills: count(skills).total,
      testimonials: count(testimonials).total,
      experience: count(experience).total,
      posts: count(posts).total,
      recordings: count(recordings).total,
      messages: count(messages).total,
      messagesUnread: messages.filter(m => !m.read).length,
    },
    visits: {
      total: visits.length,
      today: visits.filter(isToday).length,
      unique: unique(visits),
      uniqueToday: unique(visits.filter(isToday)),
    },
    recent: {
      messages: messages.slice(0, 5),
      recordings: await Promise.all(
        recordings.slice(0, 5).map(async row => ({
          ...row,
          url: await signObject('recordings', row.path).catch(() => null),
        })),
      ),
    },
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const passphrase = process.env.ADMIN_PASSPHRASE
  if (!passphrase || !isServiceConfigured()) {
    return res.status(503).json({ error: 'Admin dashboard is not configured' })
  }

  const { action, passphrase: provided, id, table, data } = req.body || {}
  if (!safeEqual(provided, passphrase)) return res.status(401).json({ error: 'Wrong passphrase' })

  try {
    if (action === 'stats') {
      return res.status(200).json({ ok: true, ...(await buildStats()) })
    }

    if (action === 'table') {
      if (!CONTENT_TABLES.includes(table)) return res.status(400).json({ error: 'Unknown table' })
      const order = table === 'messages' ? '&order=created_at.desc' : '&order=sort_order.asc'
      const rows = (await serviceList(table, order)) || []
      return res.status(200).json({ ok: true, rows })
    }

    if (action === 'profile') {
      const row = await getProfileRow()
      return res.status(200).json({ ok: true, item: row })
    }

    if (action === 'upsert') {
      if (!CONTENT_TABLES.includes(table)) return res.status(400).json({ error: 'Unknown table' })
      if (id && !UUID.test(id) && !/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid id' })
      const payload = clean(data)
      if (!Object.keys(payload).length) return res.status(400).json({ error: 'Nothing to save' })
      await serviceUpsert(table, payload, id)
      return res.status(200).json({ ok: true })
    }

    if (action === 'updateProfile') {
      const payload = clean(data)
      const existing = await getProfileRow()
      if (existing) await serviceUpdate('profile', existing.id, payload)
      else await serviceInsert('profile', payload)
      return res.status(200).json({ ok: true })
    }

    if (action === 'deleteRow') {
      if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Unknown table' })
      if (!id) return res.status(400).json({ error: 'Missing id' })
      if (table === 'recordings') {
        if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid recording id' })
        const rows = (await serviceList('recordings', `&id=eq.${id}`)) || []
        if (rows[0]?.path) await deleteObject('recordings', rows[0].path).catch(() => {})
        await serviceDeleteRow('recordings', id)
      } else {
        await serviceDeleteRow(table, id)
      }
      return res.status(200).json({ ok: true })
    }

    if (action === 'messageRead') {
      if (!id || !UUID.test(id)) return res.status(400).json({ error: 'Invalid message id' })
      await serviceUpdate('messages', id, { read: Boolean(data?.read) })
      return res.status(200).json({ ok: true })
    }

    if (action === 'list') {
      const rows = (await serviceList('recordings', '&order=created_at.desc')) || []
      const items = await Promise.all(
        rows.map(async row => ({
          ...row,
          url: await signObject('recordings', row.path).catch(() => null),
        })),
      )
      return res.status(200).json({ items })
    }

    if (action === 'delete') {
      if (!id || !UUID.test(id)) return res.status(400).json({ error: 'Invalid recording id' })
      const rows = (await serviceList('recordings', `&id=eq.${id}`)) || []
      if (rows[0]?.path) await deleteObject('recordings', rows[0].path).catch(() => {})
      await serviceDeleteRow('recordings', id)
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (error) {
    console.error('admin handler failed', error)
    return res.status(500).json({ error: 'Admin dashboard unavailable' })
  }
}