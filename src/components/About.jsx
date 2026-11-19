import Reveal from './Reveal'
import Icon from './Icons'
import { usePortfolioData } from '../lib/usePortfolioData'
import { fallbackProfile } from '../lib/fallbackData'

const capabilities = [
  'Production-ready systems',
  'Secure API development',
  'REST & GraphQL APIs',
  'Platform hosting',
  'Server & database deployment',
  'Domains, SSL & uptime monitoring',
  'Database architecture',
  'Penetration testing',
  'Real-time applications',
  'CI/CD pipelines',
]

export default function About() {
  const { data: profile } = usePortfolioData('profile', fallbackProfile)
  const alias = profile?.alias || 'M4STER'

  return (
    <section className="section" id="about">
      <Reveal>
        <header className="about-heading">
          <span className="about-kicker"><Icon name="user" /> // whoami</span>
          <h2>About Me</h2>
          <h3>My Featured Work</h3>
          <p>Full-stack developer, API engineer &amp; platform host building real-world systems.</p>
        </header>
      </Reveal>

      <div className="about-layout">
        <Reveal className="about-photo-cell">
          <figure className="about-photo">
            <img
              src="/projects/admin-platform.png"
              alt={`${alias} platform preview`}
              loading="lazy"
              decoding="async"
            />
          </figure>
        </Reveal>

        <Reveal>
          <article className="panel about-story">
            <span className="about-alias">({alias})</span>
            <h3>Introduce Myself</h3>
            <p>
              I'm a web developer focused on building functional, production-ready systems —
              including APIs, dashboards, authentication flows, and real data-driven applications. I don't
              just design interfaces; I build the logic behind them, connect databases, secure user access,
              and make sure applications actually run reliably in the real world.
            </p>
            <p>
              I also host the platforms I build. That means the API, the server, the domain, SSL and the deployment
              pipeline are handled end to end — and monitored after launch, so clients get a live URL that keeps
              serving instead of a project that only works on a laptop.
            </p>
            <p>
              With a background in cybersecurity, I bring a security-first mindset to every project — from
              penetration testing to building hardened APIs.
            </p>
          </article>
        </Reveal>
      </div>

      <Reveal>
        <aside className="panel about-services about-services-block">
          <div className="about-services-head">
            <span>What I build</span>
            <span>{String(capabilities.length).padStart(2, '0')} services</span>
          </div>
          <ul>
            {capabilities.map(capability => (
              <li key={capability}>
                <span className="service-check" aria-hidden="true"><Icon name="check" /></span>
                <span>{capability}</span>
              </li>
            ))}
          </ul>
          <a href="#contact" className="btn btn-primary about-hire">
            <span className="btn-caret">→</span> Hire Me
          </a>
        </aside>
      </Reveal>
    </section>
  )
}
