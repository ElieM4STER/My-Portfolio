// Setup checker: verifies .env, Supabase connectivity, schema and storage.
// Run with: npm run check
// It never prints secret values — only whether each piece is present/working.

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readEnv(file) {
  const path = resolve(root, file)
  if (!existsSync(path)) return null
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const results = []
const ok = name => results.push(['OK', name, ''])
const fail = (name, fix) => results.push(['MISSING', name, fix])
const warn = (name, fix) => results.push(['WARN', name, fix])

const env = readEnv('.env')
if (!env) {
  fail('.env file', 'Copy .env.example to .env and fill in your Supabase keys.')
} else {
  const need = (key, label, fix) => (env[key] ? ok(`${label} (${key})`) : fail(label, fix))

  need(
    'VITE_SUPABASE_URL',
    'Browser Supabase URL',
    'Settings > API > Project URL -> VITE_SUPABASE_URL and SUPABASE_URL',
  )
  need(
    'VITE_SUPABASE_ANON_KEY',
    'Browser anon key',
    'Settings > API > anon public key -> VITE_SUPABASE_ANON_KEY and SUPABASE_ANON_KEY',
  )
  need('SUPABASE_SERVICE_ROLE_KEY', 'Server service-role key', 'Settings > API > service_role key -> SUPABASE_SERVICE_ROLE_KEY')
  need('ADMIN_PASSPHRASE', 'Admin passphrase', 'Pick a password -> ADMIN_PASSPHRASE (used at /#/admin)')

  if (env.VITE_SUPABASE_URL && env.SUPABASE_URL && env.VITE_SUPABASE_URL !== env.SUPABASE_URL) {
    warn('URLs differ between browser and server', 'Set SUPABASE_URL to the same value as VITE_SUPABASE_URL')
  }
  if (env.ADMIN_PASSPHRASE && env.ADMIN_PASSPHRASE.length < 8) {
    warn('Admin passphrase is shorter than 8 characters', 'Use a longer ADMIN_PASSPHRASE')
  }

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const service = env.SUPABASE_SERVICE_ROLE_KEY

  if (url && anon) {
    const anonHead = { apikey: anon, Authorization: `Bearer ${anon}` }

    const probe = async (path, headers) => {
      try {
        const res = await fetch(`${url}${path}`, { headers })
        return { status: res.status, body: await res.text() }
      } catch (err) {
        return { status: 0, body: err.message }
      }
    }

    const profile = await probe('/rest/v1/profile?select=id&limit=1', anonHead)
    if (profile.status === 200) ok('Supabase reachable, profile table exists')
    else if (profile.status === 401 || profile.status === 403) fail('Anon key rejected by Supabase', 'Copy the anon key again from Settings > API')
    else fail('profile table / Supabase REST', `Run supabase/schema.sql in the SQL editor (status ${profile.status})`)

    const recordings = await probe('/rest/v1/recordings?select=id&limit=1', anonHead)
    if (recordings.status === 200) ok('recordings table exists')
    else fail('recordings table', 'Run supabase/schema.sql in the SQL editor (creates recordings + policies)')

    if (service) {
      const serviceHead = { apikey: service, Authorization: `Bearer ${service}` }
      const rows = await probe('/rest/v1/recordings?select=id&limit=1', serviceHead)
      if (rows.status === 200) ok('Service-role key can read recordings (admin inbox)')
      else fail('Service-role key rejected', `Copy the service_role key again (status ${rows.status})`)

      const buckets = await probe('/storage/v1/bucket', serviceHead)
      if (buckets.status === 200) {
        try {
          const list = JSON.parse(buckets.body)
          if (list.some(b => b.id === 'recordings')) ok('Storage bucket "recordings" exists')
          else fail('Storage bucket "recordings"', 'Run supabase/schema.sql (creates the private recordings bucket)')
        } catch {
          fail('Storage buckets listing', `Unexpected response (status ${buckets.status})`)
        }
      } else {
        fail('Storage API', `Status ${buckets.status} — check SUPABASE_SERVICE_ROLE_KEY`)
      }
    }
  }
}

console.log('\nPlatform setup check\n')
for (const [state, name, fix] of results) {
  const tag = state === 'OK' ? '[OK]     ' : state === 'WARN' ? '[WARN]   ' : '[MISSING]'
  console.log(`${tag} ${name}`)
  if (fix) console.log(`          -> ${fix}`)
}
const missing = results.filter(([state]) => state === 'MISSING').length
console.log('')
if (missing === 0) {
  console.log('All checks passed. Start with: npm run dev  (site at /, admin at /#/admin)')
} else {
  console.log(`${missing} item(s) need attention. Re-run with: npm run check`)
  process.exitCode = 1
}
