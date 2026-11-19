import { useCallback, useEffect, useState } from 'react'
import Icon from './Icons'
import CallStage from './CallStage'
import useLiveCall, { CALL_STATUS } from '../lib/useLiveCall'

const STORAGE_KEY = 'elie-admin-pass'
const IN_CALL = [CALL_STATUS.CONNECTING, CALL_STATUS.ACTIVE]

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'chart', tone: 'home' },
  { id: 'projects', label: 'Projects', icon: 'rocket', tone: 'rocket' },
  { id: 'testimonials', label: 'Testimonials', icon: 'chat', tone: 'chat' },
  { id: 'skills', label: 'Skills', icon: 'code', tone: 'code' },
  { id: 'experience', label: 'Experience', icon: 'briefcase', tone: 'briefcase' },
  { id: 'posts', label: 'Blog Posts', icon: 'terminal', tone: 'terminal' },
  { id: 'messages', label: 'Messages', icon: 'mail', tone: 'mail' },
  { id: 'recordings', label: 'Video Messages', icon: 'video', tone: 'cogs' },
  { id: 'profile', label: 'Website Info', icon: 'user', tone: 'user' },
]

const PAGE_META = Object.fromEntries(NAV.map(item => [item.id, item]))

async function adminRequest(passphrase, payload) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}

function friendlyNote(err) {
  if (err.status === 401) return "That passphrase didn't match — try again."
  if (err.status === 503) return "The admin dashboard isn't connected yet."
  if (err.status === 400) return err.message || 'That request was invalid.'
  return 'Something went wrong — please try again.'
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value
  return String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

function toNothing(value) {
  return String(value || '').trim()
}

export default function Admin() {
  const [pass, setPass] = useState(() => sessionStorage.getItem(STORAGE_KEY) || '')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [unlocked, setUnlocked] = useState(() => Boolean(sessionStorage.getItem(STORAGE_KEY)))
  const [restoring, setRestoring] = useState(() => Boolean(sessionStorage.getItem(STORAGE_KEY)))

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return undefined
    let cancelled = false
    adminRequest(stored, { action: 'stats' })
      .then(() => {
        if (!cancelled) {
          setPass(stored)
          setUnlocked(true)
        }
      })
      .catch(() => {
        if (cancelled) return
        sessionStorage.removeItem(STORAGE_KEY)
        setValue('')
        setPass('')
      })
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const unlock = async event => {
    event.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await adminRequest(value.trim(), { action: 'stats' })
      sessionStorage.setItem(STORAGE_KEY, value.trim())
      setPass(value.trim())
      setUnlocked(true)
    } catch (err) {
      setError(friendlyNote(err))
    } finally {
      setBusy(false)
    }
  }

  const lock = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setPass('')
    setUnlocked(false)
    setValue('')
  }, [])

  if (!unlocked) {
    return (
      <main className="admin-shell">
        <form className="admin-gate" onSubmit={unlock}>
          <span className="rec-badge"><Icon name="lock" /></span>
          <span className="section-eyebrow">Restricted</span>
          <h1>Admin dashboard</h1>
          <p>Enter your passphrase to manage content, messages, recordings and site insights.</p>
          <label className="form-field">
            <span>Passphrase</span>
            <input
              type="password"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="Your passphrase"
              autoFocus
            />
          </label>
          {restoring && <p className="form-note">Restoring your session…</p>}
          {!restoring && error && <p className="form-note">{error}</p>}
          <div className="rec-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || restoring || !value.trim()}>
              <Icon name="lock" /> {busy ? 'Checking…' : 'Unlock'}
            </button>
            <a className="btn btn-light" href="#home">Back to site</a>
          </div>
        </form>
      </main>
    )
  }

  return <AdminDashboard pass={pass} onLock={lock} />
}

function AdminDashboard({ pass, onLock }) {
  const call = useLiveCall('admin')
  const [page, setPage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const inCall = IN_CALL.includes(call.status)
  const meta = PAGE_META[page]

  const go = next => {
    setPage(next)
    setMenuOpen(false)
  }

  return (
    <main className="dashboard-shell">
      <aside className={`dash-side${menuOpen ? ' open' : ''}`}>
        <div className="dash-brand">
          <span className="dash-logo" data-tone="rocket"><Icon name="code" /></span>
          <div>
            <strong>Elie's Admin</strong>
            <span>Content dashboard</span>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Admin sections">
          {NAV.map(item => (
            <button
              key={item.id}
              type="button"
              className={`dash-nav-item${page === item.id ? ' active' : ''}`}
              data-tone={item.tone}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-side-foot">
          <span className={`admin-badge${call.adminOnline ? ' on' : ''}`}>
            <i className="status-dot" />
            {call.adminOnline ? 'Call line online' : 'Connecting…'}
          </span>
          <a className="dash-link" href="#home"><Icon name="external" /> View site</a>
          <button type="button" className="dash-link dash-link-danger" onClick={onLock}>
            <Icon name="lock" /> Lock
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="dash-scrim" onClick={() => setMenuOpen(false)}></div>
      )}

      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-top-title">
            <button
              type="button"
              className="dash-burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open admin menu"
            >
              <i className="dash-burger-line" />
              <i className="dash-burger-line" />
              <i className="dash-burger-line" />
            </button>
            <div>
              <span className="section-eyebrow">Admin</span>
              <h1>{meta.label}</h1>
            </div>
          </div>
          <div className="dash-top-actions">
            <span className={`admin-badge${call.adminOnline ? ' on' : ''}`}>
              <i className="status-dot" />
              {call.adminOnline ? 'Online' : 'Connecting…'}
            </span>
            <a className="btn btn-light" href="#home"><Icon name="external" /> View site</a>
          </div>
        </header>

        <div className="dash-content">
          {page === 'dashboard' && <OverviewPage pass={pass} go={go} />}
          {page === 'projects' && (
            <CollectionPage
              pass={pass}
              table="projects"
              tone="rocket"
              empty="No projects yet — add your first project."
              fields={PROJECT_FIELDS}
              preview={item => [
                { k: 'Description', v: item.description },
                { k: 'Tags', v: item.tags },
              ]}
            />
          )}
          {page === 'testimonials' && (
            <CollectionPage
              pass={pass}
              table="testimonials"
              tone="chat"
              empty="No testimonials yet — add one."
              fields={TESTIMONIAL_FIELDS}
              preview={item => [{ k: 'Quote', v: item.quote }]}
            />
          )}
          {page === 'skills' && (
            <CollectionPage
              pass={pass}
              table="skills"
              tone="code"
              empty="No skills yet — add one."
              fields={SKILL_FIELDS}
              preview={item => [{ k: 'Category', v: item.category }]}
            />
          )}
          {page === 'experience' && (
            <CollectionPage
              pass={pass}
              table="experience"
              tone="briefcase"
              empty="No experience entries yet — add one."
              fields={EXPERIENCE_FIELDS}
              preview={item => [{ k: 'Place', v: item.place }, { k: 'Tags', v: item.tags }]}
            />
          )}
          {page === 'posts' && (
            <CollectionPage
              pass={pass}
              table="posts"
              tone="terminal"
              empty="No blog posts yet — write your first one."
              fields={POST_FIELDS}
              preview={item => [{ k: 'Category', v: item.category }, { k: 'Excerpt', v: item.excerpt }]}
            />
          )}
          {page === 'messages' && <MessagesPage pass={pass} />}
          {page === 'recordings' && <RecordingsPage pass={pass} onLock={onLock} />}
          {page === 'profile' && <ProfilePage pass={pass} />}
        </div>
      </div>

      {call.status === CALL_STATUS.RINGING && call.incoming && (
        <div className="admin-incoming">
          <span className="rec-badge rec-badge-ring"><i className="status-dot" /></span>
          <div className="admin-incoming-copy">
            <strong>Incoming video call</strong>
            <p>A visitor is waiting for you to pick up.</p>
          </div>
          <div className="admin-incoming-actions">
            <button className="btn btn-primary" onClick={call.acceptCall}>
              <Icon name="phone" /> Accept
            </button>
            <button className="btn btn-light" onClick={call.declineCall}>Decline</button>
          </div>
        </div>
      )}

      {call.status === CALL_STATUS.ERROR && call.error && (
        <p className="form-note dash-call-error">{call.error}</p>
      )}

      {inCall && (
        <div className="admin-call-overlay">
          <div className="modal-card modal-card-call">
            <div className="modal-head">
              <span className="modal-kicker"><Icon name="video" /> Live with a visitor</span>
            </div>
            <div className="modal-body">
              <CallStage
                localStream={call.localStream}
                remoteStream={call.remoteStream}
                connected={call.status === CALL_STATUS.ACTIVE}
                micOn={call.micOn}
                camOn={call.camOn}
                onToggleMic={call.toggleMic}
                onToggleCam={call.toggleCam}
                onHangUp={call.hangUp}
                waitingLabel="Waiting for the visitor's video…"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function useAdminTable(pass, table) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await adminRequest(pass, { action: 'table', table })
      setRows(data.rows || [])
    } catch (err) {
      setRows([])
      setError(friendlyNote(err))
    }
  }, [pass, table])

  useEffect(() => {
    load()
  }, [load])

  const save = async (id, data) => {
    setSaving(true)
    setError('')
    try {
      await adminRequest(pass, { action: 'upsert', table, id, data })
      await load()
    } catch (err) {
      setError(friendlyNote(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async id => {
    setSaving(true)
    setError('')
    try {
      await adminRequest(pass, { action: 'deleteRow', table, id })
      await load()
    } catch (err) {
      setError(friendlyNote(err))
    } finally {
      setSaving(false)
    }
  }

  return { rows, error, saving, load, save, remove }
}

function OverviewPage({ pass, go }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminRequest(pass, { action: 'stats' })
      setStats(data)
    } catch (err) {
      setError(friendlyNote(err))
    } finally {
      setLoading(false)
    }
  }, [pass])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !stats) return <DashLoading />
  if (error && !stats) return <DashError error={error} onRetry={load} />

  const counts = stats?.counts || {}
  const visits = stats?.visits || {}

  const cards = [
    { label: 'Projects', value: counts.projects, icon: 'rocket', tone: 'rocket', page: 'projects' },
    { label: 'Skills', value: counts.skills, icon: 'code', tone: 'code', page: 'skills' },
    { label: 'Testimonials', value: counts.testimonials, icon: 'chat', tone: 'chat', page: 'testimonials' },
    { label: 'Experience', value: counts.experience, icon: 'briefcase', tone: 'briefcase', page: 'experience' },
    { label: 'Blog posts', value: counts.posts, icon: 'terminal', tone: 'terminal', page: 'posts' },
    { label: 'Video messages', value: counts.recordings, icon: 'video', tone: 'cogs', page: 'recordings' },
    {
      label: 'Messages',
      value: counts.messages,
      icon: 'mail',
      tone: 'mail',
      page: 'messages',
      note: `${counts.messagesUnread || 0} unread`,
    },
  ]

  return (
    <>
      <section className="dash-stats">
        {visits.total > 0 || visits.today > 0 ? (
          <>
            <article className="stat-card stat-card-wide" data-tone="home">
              <span className="stat-card-icon"><Icon name="chart" /></span>
              <div className="stat-card-copy">
                <span className="stat-card-label">Visitors</span>
                <strong>{visits.total}</strong>
                <span className="stat-card-note">
                  {visits.today} today · {visits.unique} unique · {visits.uniqueToday} unique today
                </span>
              </div>
            </article>
            <article className="stat-card" data-tone="rocket">
              <span className="stat-card-icon"><Icon name="rocket" /></span>
              <div className="stat-card-copy">
                <span className="stat-card-label">Projects</span>
                <strong>{counts.projects || 0}</strong>
              </div>
            </article>
            <article className="stat-card" data-tone="mail">
              <span className="stat-card-icon"><Icon name="mail" /></span>
              <div className="stat-card-copy">
                <span className="stat-card-label">Messages</span>
                <strong>{counts.messages || 0}</strong>
                <span className="stat-card-note">{counts.messagesUnread || 0} unread</span>
              </div>
            </article>
          </>
        ) : (
          cards.map(card => (
            <button key={card.label} type="button" className="stat-card stat-card-btn" data-tone={card.tone} onClick={() => go(card.page)}>
              <span className="stat-card-icon"><Icon name={card.icon} /></span>
              <div className="stat-card-copy">
                <span className="stat-card-label">{card.label}</span>
                <strong>{card.value || 0}</strong>
                {card.note && <span className="stat-card-note">{card.note}</span>}
              </div>
            </button>
          ))
        )}
      </section>

      <div className="dash-cols">
        <section className="admin-section">
          <div className="admin-section-head">
            <h2><Icon name="mail" /> Recent messages</h2>
            <button className="btn btn-light" onClick={() => go('messages')}>View all</button>
          </div>
          {stats?.recent?.messages?.length > 0 ? (
            <div className="dash-list">
              {stats.recent.messages.map(message => (
                <div key={message.id} className={`dash-list-item${message.read ? '' : ' unread'}`}>
                  <span className="dash-list-icon"><Icon name="mail" /></span>
                  <div className="dash-list-copy">
                    <strong>{message.name}</strong>
                    <p>{message.subject || message.message}</p>
                  </div>
                  <span className="dash-list-date">{formatDate(message.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-note">No messages yet. People can reach you from the Contact section.</p>
          )}
        </section>

        <section className="admin-section">
          <div className="admin-section-head">
            <h2><Icon name="video" /> Recent video messages</h2>
            <button className="btn btn-light" onClick={() => go('recordings')}>View all</button>
          </div>
          {stats?.recent?.recordings?.length > 0 ? (
            <div className="dash-grid-recent">
              {stats.recent.recordings.map(item => (
                <div key={item.id} className="dash-rec" data-tone="cogs">
                  <span className="dash-rec-icon"><Icon name="record" /></span>
                  <div className="dash-rec-copy">
                    <strong>{item.name || 'Anonymous visitor'}</strong>
                    <span>
                      {formatDate(item.created_at)}
                      {item.duration > 0 ? ` · ${formatDuration(item.duration)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-note">No recordings yet. Visitors can send one from the Contact section.</p>
          )}
        </section>
      </div>
    </>
  )
}

function CollectionPage({ pass, table, tone, empty, fields, preview }) {
  const { rows, error, saving, load, save, remove } = useAdminTable(pass, table)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = row => {
    setEditing(row)
    setOpen(true)
  }

  const handleSave = async data => {
    await save(editing?.id, data)
    setOpen(false)
  }

  const handleDelete = async row => {
    if (!window.confirm('Delete this item permanently?')) return
    await remove(row.id)
  }

  const label = (PAGE_META[table]?.label || table).toLowerCase()

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>{PAGE_META[table]?.label || table} <span className="admin-count">{rows?.length || 0}</span></h2>
        <div className="admin-bar-actions">
          <button className="btn btn-light" onClick={load} disabled={saving}>Refresh</button>
          <button className="btn btn-primary" onClick={openNew}><Icon name="plus" /> Add</button>
        </div>
      </div>

      {error && <p className="form-note">{error}</p>}

      {!rows && !error && <DashLoading />}

      {rows && rows.length === 0 && !error && (
        <div className="admin-empty">
          <span className="rec-badge"><Icon name="code" /></span>
          <p>{empty}</p>
        </div>
      )}

      <div className="dash-cards">
        {rows?.map(row => (
          <article className="dash-card" key={row.id}>
            <div className="dash-card-head">
              <h3>{row.name || row.skill || row.role || row.period || row.title || row.subject || label}</h3>
              <span className="dash-card-tone" data-tone={tone}><Icon name="code" /></span>
            </div>
            <div className="dash-card-preview">
              {preview(row).filter(p => p.v).map(p => (
                <p key={p.k}><strong>{p.k}:</strong> {Array.isArray(p.v) ? p.v.join(', ') : p.v}</p>
              ))}
            </div>
            <div className="dash-card-actions">
              <button type="button" className="admin-link" onClick={() => openEdit(row)}><Icon name="pencil" /> Edit</button>
              <button type="button" className="admin-link admin-link-danger" onClick={() => handleDelete(row)}><Icon name="trash" /> Delete</button>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <FormModal
          title={editing ? `Edit ${label}` : `Add ${label}`}
          fields={fields}
          initial={editing}
          busy={saving}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  )
}

function MessagesPage({ pass }) {
  const { rows, error, saving, load, remove } = useAdminTable(pass, 'messages')

  const toggleRead = async row => {
    try {
      await adminRequest(pass, { action: 'messageRead', id: row.id, data: { read: !row.read } })
      await load()
    } catch (err) {
      window.alert(friendlyNote(err))
    }
  }

  const handleDelete = async row => {
    if (!window.confirm('Delete this message permanently?')) return
    await remove(row.id)
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Messages <span className="admin-count">{rows?.length || 0}</span></h2>
        <div className="admin-bar-actions">
          <button className="btn btn-light" onClick={load} disabled={saving}>Refresh</button>
        </div>
      </div>

      {error && <p className="form-note">{error}</p>}

      {!rows && !error && <DashLoading />}

      {rows && rows.length === 0 && !error && (
        <div className="admin-empty">
          <span className="rec-badge"><Icon name="mail" /></span>
          <p>No messages yet. When visitors use the Contact form, they land here.</p>
        </div>
      )}

      <div className="msg-list">
        {rows?.map(row => (
          <article key={row.id} className={`msg-card${row.read ? '' : ' unread'}`}>
            <div className="msg-card-top">
              <div className="msg-card-who">
                <span className="msg-dot" title={row.read ? 'Read' : 'Unread'} />
                <strong>{row.name}</strong>
                {row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}
              </div>
              <span className="msg-date">{formatDate(row.created_at)}</span>
            </div>
            {row.subject && <h3 className="msg-subject">{row.subject}</h3>}
            <p className="msg-body">{row.message}</p>
            <div className="msg-actions">
              <button type="button" className="admin-link" onClick={() => toggleRead(row)}>
                <Icon name={row.read ? 'mail' : 'check'} /> {row.read ? 'Mark unread' : 'Mark read'}
              </button>
              <button type="button" className="admin-link admin-link-danger" onClick={() => handleDelete(row)}>
                <Icon name="trash" /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function RecordingsPage({ pass, onLock }) {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminRequest(pass, { action: 'list' })
      setItems(data.items || [])
    } catch (err) {
      if (err.status === 401) onLock()
      else setError(friendlyNote(err))
    } finally {
      setLoading(false)
    }
  }, [pass, onLock])

  useEffect(() => {
    load()
  }, [load])

  const remove = async id => {
    if (!window.confirm('Delete this recording permanently?')) return
    try {
      await adminRequest(pass, { action: 'delete', id })
      setItems(current => current.filter(item => item.id !== id))
    } catch (err) {
      setError(friendlyNote(err))
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Video messages <span className="admin-count">{items?.length || 0}</span></h2>
        <button className="btn btn-light" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="form-note">{error}</p>}

      {!loading && items && items.length === 0 && !error && (
        <div className="admin-empty">
          <span className="rec-badge"><Icon name="video" /></span>
          <p>No recordings yet. Visitors can send one from the Contact section of your site.</p>
        </div>
      )}

      <div className="admin-grid">
        {items?.map(item => (
          <AdminCard key={item.id} item={item} onDelete={() => remove(item.id)} />
        ))}
      </div>

      <p className="admin-note">
        Playback links expire after an hour — press Refresh for fresh ones. Only this console
        (via your server) can open them.
      </p>
    </section>
  )
}

function ProfilePage({ pass }) {
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await adminRequest(pass, { action: 'profile' })
      setItem(data.item || {})
    } catch (err) {
      setError(friendlyNote(err))
    }
  }, [pass])

  useEffect(() => {
    load()
  }, [load])

  const save = async data => {
    setSaving(true)
    setError('')
    try {
      await adminRequest(pass, { action: 'updateProfile', data })
      setItem(current => ({ ...current, ...data }))
      window.alert('Profile saved.')
    } catch (err) {
      setError(friendlyNote(err))
    } finally {
      setSaving(false)
    }
  }

  if (!item && !error) return <DashLoading />

  const fields = PROFILE_FIELDS.map(field => ({ ...field, value: item?.[field.key] ?? '' }))

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Website info</h2>
        <button className="btn btn-light" onClick={load} disabled={saving}>Refresh</button>
      </div>
      {error && <p className="form-note">{error}</p>}
      <ProfileForm fields={fields} busy={saving} onSave={save} />
    </section>
  )
}

function FormModal({ title, fields, initial, busy, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = {}
    for (const field of fields) {
      const source = initial ? initial[field.key] : undefined
      if (field.type === 'tags') base[field.key] = Array.isArray(source) ? source.join(', ') : source || ''
      else base[field.key] = source ?? (field.type === 'number' ? 0 : '')
    }
    return base
  })
  const [error, setError] = useState('')

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = event => {
    event.preventDefault()
    const data = {}
    for (const field of fields) {
      const raw = form[field.key]
      if (field.required && !toNothing(raw)) {
        setError(`${field.label} is required.`)
        return
      }
      if (field.type === 'number') data[field.key] = Number(raw) || 0
      else if (field.type === 'tags') data[field.key] = toArray(raw)
      else if (field.type === 'date') data[field.key] = raw || null
      else data[field.key] = toNothing(raw)
    }
    setError('')
    onSave(data)
  }

  return (
    <div className="modal-scrim">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <form onSubmit={submit}>
          <div className="modal-head">
            <span className="modal-kicker">{title}</span>
            <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="modal-body">
            {error && <p className="form-note">{error}</p>}
            <div className="form-grid">
              {fields.map(field => (
                <label
                  className={`form-field${field.required ? ' is-required' : ''}${field.type === 'textarea' ? ' is-full' : ''}`}
                  key={field.key}
                >
                  <span>{field.label}</span>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={field.rows || 4}
                      value={form[field.key]}
                      onChange={event => set(field.key, event.target.value)}
                      required={field.required}
                    />
                  ) : field.type === 'select' ? (
                    <select value={form[field.key]} onChange={event => set(field.key, event.target.value)}>
                      {field.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={form[field.key]}
                      onChange={event => set(field.key, event.target.value)}
                      required={field.required}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProfileForm({ fields, busy, onSave }) {
  const [form, setForm] = useState(() => {
    const base = {}
    for (const field of fields) {
      const { value } = field
      if (field.type === 'tags') base[field.key] = Array.isArray(value) ? value.join(', ') : value || ''
      else base[field.key] = value ?? ''
    }
    return base
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = event => {
    event.preventDefault()
    const data = {}
    for (const field of fields) {
      if (field.type === 'tags') data[field.key] = toArray(form[field.key])
      else data[field.key] = toNothing(form[field.key])
    }
    onSave(data)
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="form-grid">
        {fields.map(field => (
          <label className={`form-field${field.required ? ' is-required' : ''}`} key={field.key}>
            <span>{field.label}</span>
            <input
              type="text"
              value={form[field.key]}
              onChange={event => set(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="modal-foot profile-form-foot">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function DashLoading() {
  return (
    <div className="admin-empty">
      <span className="rec-badge"><Icon name="refresh" /></span>
      <p>Loading…</p>
    </div>
  )
}

function DashError({ error, onRetry }) {
  return (
    <div className="admin-empty">
      <span className="rec-badge"><Icon name="lock" /></span>
      <p>{error}</p>
      <button className="btn btn-light" onClick={onRetry}>Retry</button>
    </div>
  )
}

function AdminCard({ item, onDelete }) {
  const [broken, setBroken] = useState(false)
  const playable = item.url && !broken

  return (
    <article className="admin-card">
      {playable ? (
        <video
          className="admin-video"
          src={item.url}
          controls
          preload="metadata"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="admin-video admin-video-missing">
          {item.url ? 'Preview not supported by this browser' : 'Preview unavailable'}
        </div>
      )}
      <div className="admin-card-body">
        <div className="admin-card-meta">
          <strong>{item.name || 'Anonymous visitor'}</strong>
          <span><Icon name="clock" /> {formatDate(item.created_at)}</span>
        </div>
        <div className="admin-card-tags">
          {item.duration > 0 && <span>{formatDuration(item.duration)}</span>}
          {item.email && <a href={`mailto:${item.email}`}>{item.email}</a>}
        </div>
        {item.message && <p className="admin-card-msg">{item.message}</p>}
        <div className="admin-card-actions">
          {item.url && (
            <a className="admin-link" href={item.url} download>Download</a>
          )}
          <button type="button" className="admin-link admin-link-danger" onClick={onDelete}>
            <Icon name="trash" /> Delete
          </button>
        </div>
      </div>
    </article>
  )
}

const PROJECT_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea', rows: 4, required: true },
  { key: 'preview', label: 'Preview text', type: 'textarea', rows: 2 },
  { key: 'tags', label: 'Tags (comma separated)', type: 'tags' },
  { key: 'source_url', label: 'Source URL', type: 'text' },
  { key: 'live_url', label: 'Live URL', type: 'text' },
  { key: 'image_url', label: 'Image URL', type: 'text' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
]

const TESTIMONIAL_FIELDS = [
  { key: 'quote', label: 'Quote', type: 'textarea', rows: 4, required: true },
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'rating', label: 'Rating (1–5)', type: 'number' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
]

const SKILL_FIELDS = [
  { key: 'category', label: 'Category', type: 'text', required: true },
  { key: 'skill', label: 'Skill', type: 'text', required: true },
  { key: 'level', label: 'Level', type: 'select', options: ['advanced', 'intermediate', 'applied', 'beginner'] },
  { key: 'percent', label: 'Percent', type: 'number' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
]

const EXPERIENCE_FIELDS = [
  { key: 'period', label: 'Period', type: 'text', required: true },
  { key: 'role', label: 'Role', type: 'text', required: true },
  { key: 'place', label: 'Place', type: 'text' },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'text', label: 'Description', type: 'textarea', rows: 4, required: true },
  { key: 'tags', label: 'Tags (comma separated)', type: 'tags' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
]

const POST_FIELDS = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2, required: true },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'tags', label: 'Tags (comma separated)', type: 'tags' },
  { key: 'published_at', label: 'Published date', type: 'date' },
  { key: 'body', label: 'Body', type: 'textarea', rows: 10, required: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
]

const PROFILE_FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'alias', label: 'Alias', type: 'text' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'started_coding', label: 'Started coding', type: 'text' },
  { key: 'focus', label: 'Focus', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  { key: 'github', label: 'GitHub', type: 'text' },
  { key: 'roles', label: 'Roles (comma separated)', type: 'tags' },
]