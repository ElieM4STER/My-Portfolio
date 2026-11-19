import Reveal from './Reveal'
import Icon from './Icons'

const SERVICES = [
  {
    id: 'api',
    icon: 'api',
    tone: 'var(--ic-skills)',
    title: 'API Development',
    text: 'REST and GraphQL APIs with predictable contracts, validation, authentication and rate limits — documented so any frontend can consume them.',
    points: ['REST & GraphQL', 'Auth & rate limits', 'API documentation'],
  },
  {
    id: 'hosting',
    icon: 'host',
    tone: 'var(--ic-built-with)',
    title: 'Platform Hosting',
    text: 'Full-stack platforms hosted on Linux VPS with process management, logging and a real live URL — not just a project that runs on one laptop.',
    points: ['Linux VPS', 'Process & logs', 'Live production URL'],
  },
  {
    id: 'deployment',
    icon: 'deploy',
    tone: 'var(--ic-projects)',
    title: 'Deployment & CI/CD',
    text: 'Domain, DNS and SSL wired up, plus a repeatable deploy pipeline so every release is a push instead of a manual ritual.',
    points: ['Domains, DNS & SSL', 'Automated builds', 'Rollbacks'],
  },
  {
    id: 'monitoring',
    icon: 'monitor',
    tone: 'var(--ic-home)',
    title: 'Maintenance & Monitoring',
    text: 'Uptime checks, backups and patching after launch, so your API and platform keep serving when clients are using them.',
    points: ['Uptime monitoring', 'Backups', 'Updates & patches'],
  },
  {
    id: 'security',
    icon: 'shield',
    tone: 'var(--ic-blog)',
    title: 'API Security',
    text: 'Security-first engineering: hardened endpoints, access control and penetration testing informed by a cybersecurity background.',
    points: ['Hardened endpoints', 'Pen testing', 'Access control'],
  },
  {
    id: 'data',
    icon: 'database',
    tone: 'var(--ic-services)',
    title: 'Databases & Performance',
    text: 'Schema design, indexing and query tuning so the API answers fast and the platform stays responsive under real traffic.',
    points: ['Schema design', 'Indexing', 'Query tuning'],
  },
]

export default function Services() {
  return (
    <section className="section" id="services">
      <Reveal>
        <header className="section-intro">
          <div>
            <span className="section-eyebrow"><Icon name="cogs" /> Services</span>
            <h2>Build it, then host it.</h2>
          </div>
          <p>
            Everything needed to take a platform from an idea to a live, secure, monitored API — development and
            hosting handled end to end, so nothing is left for you to figure out.
          </p>
        </header>
      </Reveal>

      <div className="services-grid">
        {SERVICES.map((service, index) => (
          <Reveal key={service.id}>
            <article className="service-card">
              <div className="service-card-top">
                <span className="service-icon" style={{ '--tone': service.tone }} aria-hidden="true"><Icon name={service.icon} /></span>
                <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <ul className="service-points">
                {service.points.map(point => (
                  <li key={point}>
                    <span className="service-check" aria-hidden="true"><Icon name="check" /></span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="services-cta">
          <p>Need an API built, a platform hosted, or both?</p>
          <a href="#contact" className="btn btn-primary">
            <span className="btn-caret">→</span> Start a Project
          </a>
        </div>
      </Reveal>
    </section>
  )
}
