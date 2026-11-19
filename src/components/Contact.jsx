import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import Icon from './Icons'
import RecordModal from './RecordModal'
import CallModal from './CallModal'
import { usePortfolioData } from '../lib/usePortfolioData'
import { warmCallTransport } from '../lib/realtime'
import { fallbackProfile } from '../lib/fallbackData'

const EMPTY_FORM = { name: '', email: '', subject: '', message: '' }

export default function Contact() {
  const { data: profile } = usePortfolioData('profile', fallbackProfile)
  const [form, setForm] = useState(EMPTY_FORM)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentError, setSentError] = useState('')
  const [connect, setConnect] = useState(null)
  const connectRef = useRef(null)

  // Warm the realtime socket as soon as the "Connect with Elie" panel is near
  // the viewport, so opening the call modal skips the TCP+TLS handshake.
  useEffect(() => {
    const el = connectRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          warmCallTransport()
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const email = profile?.email || 'byiringiroelie468@gmail.com'
  const whatsapp = String(profile?.whatsapp || '0783547443').replace(/\s/g, '')
  const instagram = String(profile?.instagram || 'elie___001').replace(/^@/, '')
  const github = String(profile?.github || 'ElieM4STER').replace(/^@/, '')
  const location = profile?.location || 'Kigali, Rwanda'

  const phone = String(profile?.phone || whatsapp).replace(/\s/g, '')
  const toDial = value => {
    const digits = String(value).replace(/\D/g, '')
    if (!digits) return ''
    if (digits.length === 10 && digits.startsWith('0')) return `+250${digits.slice(1)}`
    return digits.startsWith('+') ? digits : `+${digits}`
  }
  const telHref = `tel:${toDial(phone)}`

  const details = [
    { id: 'email', icon: 'mail', label: 'Email', value: email, href: `mailto:${email}` },
    { id: 'whatsapp', icon: 'phone', label: 'WhatsApp', value: `+${whatsapp}`, href: `https://wa.me/${whatsapp}` },
    { id: 'instagram', icon: 'instagram', label: 'Instagram', value: `@${instagram}`, href: `https://instagram.com/${instagram}` },
    { id: 'github', icon: 'github', label: 'GitHub', value: `github.com/${github}`, href: `https://github.com/${github}` },
    { id: 'location', icon: 'pin', label: 'Location', value: location },
  ]

  const update = field => event => {
    setForm(current => ({ ...current, [field]: event.target.value }))
    setSent(false)
  }

  const submit = async event => {
    event.preventDefault()
    if (sending) return
    setSentError('')
    setSending(true)
    setSent(false)

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    }

    try {
      const res = await fetch('/api/contact', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
      if (res.ok) { setForm(EMPTY_FORM); setSent(true); setSending(false); return }
    } catch(e) { /* ignore */ }

    try {
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('email', payload.email)
      formData.append('subject', payload.subject || 'Portfolio message from ' + (payload.name||'a visitor'))
      formData.append('message', payload.message)
      formData.append('_captcha', 'false')
      formData.append('_template', 'table')
      const fsRes = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {method:'POST', headers:{'Accept':'application/json'}, body: formData})
      if (fsRes.ok) { setForm(EMPTY_FORM); setSent(true); setSending(false); return }
    } catch(e) { /* ignore */ }

    setSending(false)
    const subj = payload.subject || 'Portfolio message from ' + (payload.name||'a visitor')
    const body = payload.message + '\n\n— ' + (payload.name||'Visitor') + (payload.email ? ' (' + payload.email + ')' : '')
    window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body)
    setSent(true)
  }

  return (
    <section className="section" id="contact">
      <Reveal>
        <header className="section-intro">
          <div>
            <span className="section-eyebrow"><Icon name="mail" /> Contact</span>
            <h2>Let&rsquo;s Work Together</h2>
          </div>
          <p>Have an API to build or a platform to host? Get in touch.</p>
        </header>
      </Reveal>

      <div className="contact-layout">
        <Reveal>
          <div className="contact-panel">
            <h3>Tell me about your project.</h3>
            <p>
              I&rsquo;m currently available for freelance work and full-time opportunities. Need a secure API
              built, a platform hosted and deployed, or an existing system maintained and monitored? Tell me what
              you&rsquo;re trying to run and I&rsquo;ll reply with an approach.
            </p>

            <ul className="contact-list">
              {details.map(item => (
                <li key={item.id}>
                  <span className="contact-icon" aria-hidden="true"><Icon name={item.icon} /></span>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noreferrer">{item.value}</a>
                  ) : (
                    <strong>{item.value}</strong>
                  )}
                </li>
              ))}
            </ul>

            <div className="contact-actions">
              <a href={telHref} className="btn btn-call">
                <Icon name="phone" /> Call me <span>→</span>
              </a>
              <a href={`mailto:${email}`} className="btn btn-dark">
                <Icon name="mail" /> Email me <span>→</span>
              </a>
              <a href={`https://wa.me/${whatsapp}`} className="btn btn-light" target="_blank" rel="noreferrer">
                <Icon name="whatsapp" /> WhatsApp <span>↗</span>
              </a>
            </div>

            <div
              className="connect-live"
              ref={connectRef}
              onMouseEnter={warmCallTransport}
              onFocus={warmCallTransport}
            >
              <span className="connect-title"><Icon name="video" /> Connect with Elie</span>
              <p>Record a video message with your camera, or start a live call if he&rsquo;s online.</p>
              <div className="connect-buttons">
                <button type="button" className="btn btn-light" onClick={() => setConnect('record')}>
                  <Icon name="record" /> Record a video
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setConnect('call')}>
                  <Icon name="phone" /> Live video call
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <form className="contact-form" onSubmit={submit}>
            <div className="form-row">
              <label className="form-field">
                <span>Your Name</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Your Name"
                  required
                />
              </label>
              <label className="form-field">
                <span>Your Email</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="Your Email"
                  required
                />
              </label>
            </div>

            <label className="form-field">
              <span>Subject</span>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={update('subject')}
                placeholder="Subject"
              />
            </label>

            <label className="form-field">
              <span>Your Message</span>
              <textarea
                name="message"
                rows="5"
                value={form.message}
                onChange={update('message')}
                placeholder="Your Message..."
                required
              ></textarea>
            </label>

            <button className="btn btn-primary form-send" type="submit" disabled={sending}>
              <Icon name="send" /> {sending ? 'Sending…' : 'Send Message'} <span aria-hidden="true">→</span>
            </button>
            {sent && <p className="form-note">Thank you — your message has been sent.</p>}
            {sentError && <p className="form-note">{sentError}</p>}
          </form>
        </Reveal>
      </div>

      {connect === 'record' && (
        <RecordModal onClose={() => setConnect(null)} onSwitchToCall={() => setConnect('call')} />
      )}
      {connect === 'call' && (
        <CallModal onClose={() => setConnect(null)} onSwitchToRecord={() => setConnect('record')} />
      )}
    </section>
  )
}
