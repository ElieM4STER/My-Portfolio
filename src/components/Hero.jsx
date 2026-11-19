import { useEffect, useState } from 'react'
import CountUp from './CountUp'
import Reveal from './Reveal'
import Icon from './Icons'
import { usePortfolioData } from '../lib/usePortfolioData'
import { fallbackProfile, fallbackSkills, fallbackTestimonials } from '../lib/fallbackData'

const ROLES = ['Full-Stack Developer', 'Cybersecurity Analyst', 'API Architect', 'Platform Hosting']

const getRoleIcon = word => {
  const value = String(word).toLowerCase()
  if (value.includes('cyber') || value.includes('security')) return 'shield'
  if (value.includes('api')) return 'api'
  if (value.includes('host') || value.includes('deploy') || value.includes('cloud') || value.includes('server')) return 'host'
  if (value.includes('full') || value.includes('stack') || value.includes('developer')) return 'laptop'
  if (value.includes('frontend') || value.includes('design')) return 'brush'
  if (value.includes('data') || value.includes('database')) return 'database'
  if (value.includes('devops') || value.includes('ci/cd') || value.includes('pipeline')) return 'cogs'
  return 'code'
}

const PROFILE_STATS = [
  { id: 'experience', value: 2, label: 'Years Exp.' },
  { id: 'projects', value: 6, label: 'Projects' },
  { id: 'pagespeed', value: 95, label: 'PageSpeed' },
  { id: 'kchats', value: 238, label: 'K-Chart' },
  { id: 'reviews', value: 3, suffix: '★', label: 'Reviews' },
  { id: 'skills', value: 12, suffix: '+', label: 'Skills' },
]

const GITHUB_URL = 'https://github.com/ElieM4STER'

function RoleList({ roles }) {
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')

  useEffect(() => {
    if (reduced) return undefined
    const word = roles[index] || roles[0]
    if (!word) return undefined

    let cancelled = false
    let chars = 0
    let deleting = false
    let timer

    const step = () => {
      if (cancelled) return
      if (deleting) {
        chars -= 1
        setText(word.slice(0, Math.max(chars, 0)))
        if (chars <= 0) {
          setIndex(i => (i + 1) % roles.length)
          return
        }
        timer = setTimeout(step, 28)
      } else {
        chars += 1
        setText(word.slice(0, chars))
        if (chars >= word.length) {
          deleting = true
          timer = setTimeout(step, 1900)
          return
        }
        timer = setTimeout(step, 65)
      }
    }

    timer = setTimeout(step, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [index, roles, reduced])

  const icon = getRoleIcon(roles[index] || roles[0])
  const display = reduced ? roles.join('  •  ') : text

  return (
    <div className="role-list" aria-label={`Professional roles: ${roles.join(', ')}`}>
      <span className="role-line" aria-hidden="true">
        <span className="role-word" key={index}>
          <Icon name={icon} className="role-word-icon" />
          <span className="role-word-typed">{display}</span>
        </span>
        <span className="role-caret">▌</span>
      </span>
    </div>
  )
}

export default function Hero() {
  const name = 'Byiringiro Elie'
  const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
  const [photoOk, setPhotoOk] = useState(true)
  const { data: profile } = usePortfolioData('profile', fallbackProfile)
  const { data: skills } = usePortfolioData('skills', fallbackSkills)
  const { data: testimonials } = usePortfolioData('testimonials', fallbackTestimonials)
  const roles = Array.isArray(profile?.roles) && profile.roles.length ? profile.roles : ROLES
  const githubUrl = profile?.github ? `https://github.com/${profile.github}` : GITHUB_URL

  const stats = PROFILE_STATS.map(stat => {
    if (stat.id === 'reviews' && Array.isArray(testimonials) && testimonials.length) {
      return { ...stat, value: testimonials.length }
    }
    if (stat.id === 'skills' && Array.isArray(skills) && skills.length) {
      return { ...stat, value: skills.length }
    }
    return stat
  })

  return (
    <section className="hero" id="home">
      <div className="hero-container">
        <div className="hero-text">
          <div className="availability">
            <span className="status-dot" aria-hidden="true"></span>
            Available for new opportunities
          </div>
          <div className="identity">
            <h1 className="name">{name}</h1>
            <span className="hero-alias">(M4STER)</span>
          </div>
          <RoleList roles={roles} />
          <p className="hero-description">
            I build and host production platforms — secure APIs, authenticated dashboards, reliable databases
            and deployments that stay online. Need an API built, a platform hosted, or both? Let&rsquo;s talk.
          </p>
          <div className="hero-meta">
            <span>Kigali, Rwanda</span>
            <a href="mailto:byiringiroelie468@gmail.com">byiringiroelie468@gmail.com</a>
          </div>
          <div className="hero-actions">
            <a href="#projects" className="btn btn-primary">
              <span className="btn-caret">↗</span> View Projects
            </a>
            <a href="#contact" className="btn btn-ghost">
              <span className="btn-caret">→</span> Contact Me
            </a>
            <a className="btn btn-ghost" href={githubUrl} target="_blank" rel="noreferrer">
              <span className="btn-caret">
                <Icon name="github" />
              </span>
              GitHub
            </a>
          </div>

          <div className="hero-wordmark" aria-hidden="true">
            <span className="logo-bracket">[</span>
            <span>M4STER</span>
            <span className="logo-bracket">]</span>
            <span className="logo-cursor">_</span>
          </div>
        </div>

        <div className="hero-side">
          <Reveal className="profile-wrap">
            <div className="profile">
              <div className="profile-frame">
                {photoOk ? (
                  <img
                    src="/profile-photo.png"
                    alt={`${name} profile portrait`}
                    onError={() => setPhotoOk(false)}
                  />
                ) : (
                  <span className="profile-fallback">{initials}</span>
                )}
                <span className="profile-sparkle" aria-hidden="true" />
              </div>
            </div>
          </Reveal>

          <Reveal className="profile-stats">
            {stats.map(stat => (
              <div className={`profile-stat${stat.tone ? ` profile-stat-${stat.tone}` : ''}`} key={stat.id}>
                <strong><CountUp end={stat.value} suffix={stat.suffix} /></strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </Reveal>

          <Reveal className="hero-side-extra">
            <button
              className="profile-chat"
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-elie-chat'))}
            >
              <span className="profile-chat-avatar">M</span>
              <span className="profile-chat-copy">
                <strong>Chat Elie Bot</strong>
                <small>Ask anything, or chat about my work</small>
              </span>
              <span className="profile-chat-arrow" aria-hidden="true">→</span>
            </button>
          </Reveal>
        </div>
      </div>

      <a href="#about" className="scroll-cue" aria-label="Go to the about section">
        <span>SCROLL</span>
        <span className="cue-line"></span>
      </a>
    </section>
  )
}