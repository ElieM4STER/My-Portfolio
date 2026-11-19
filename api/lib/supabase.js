const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

const heads = { apikey: key, Authorization: `Bearer ${key}` }

export async function fetchTable(table, orderBy = 'sort_order') {
  if (!url || !key) return null
  try {
    const order = orderBy ? `&order=${orderBy}.asc` : '&limit=1'
    const res = await fetch(`${url}/rest/v1/${table}?select=*${order}`, { headers: heads })
    if (!res.ok) return null
    const json = await res.json()
    if (!orderBy) return Array.isArray(json) ? json[0] ?? null : json
    return json
  } catch {
    return null
  }
}

export async function insertRow(table, data) {
  if (!url || !key) return false
  try {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...heads, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchPortfolio() {
  const [profile, stats, experience, skills, projects, posts, testimonials, focus] = await Promise.all([
    fetchTable('profile', null),
    fetchTable('stats'),
    fetchTable('experience'),
    fetchTable('skills'),
    fetchTable('projects'),
    fetchTable('posts'),
    fetchTable('testimonials'),
    fetchTable('focus'),
  ])
  return { profile, stats, experience, skills, projects, posts, testimonials, focus }
}

// ---- service-role helpers (used by api/admin.js only) ----

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function isServiceConfigured() {
  return Boolean(url && serviceKey)
}

async function serviceFetch(path, init = {}) {
  if (!isServiceConfigured()) throw new Error('Service role key is not configured')
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...(init.headers || {}) }
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${url}${path}`, { ...init, headers })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export async function serviceList(table, query = '') {
  return serviceFetch(`/rest/v1/${table}?select=*${query}`)
}

export async function serviceInsert(table, data) {
  await serviceFetch(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Prefer: 'return=minimal' },
  })
}

export async function serviceUpdate(table, id, data) {
  await serviceFetch(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { Prefer: 'return=minimal' },
  })
}

export async function serviceUpsert(table, data, id) {
  if (id) await serviceUpdate(table, id, data)
  else await serviceInsert(table, data)
}

export async function serviceDeleteRow(table, id) {
  await serviceFetch(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
}

export async function signObject(bucket, path, expiresIn = 3600) {
  const data = await serviceFetch(
    `/storage/v1/object/sign/${bucket}/${encodeURIComponent(path)}`,
    { method: 'POST', body: JSON.stringify({ expiresIn }) },
  )
  const signed = data?.signedURL || data?.signedUrl
  return signed ? `${url}${signed}` : null
}

export async function deleteObject(bucket, path) {
  await serviceFetch(`/storage/v1/object/${bucket}/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
}