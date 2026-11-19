import Reveal from './Reveal'
import Icon from './Icons'
import TechIcon from './TechIcons'
import { techIconTint } from '../lib/techIcons'

const STACK = [
  { id: 'react', label: 'React', text: 'Component-driven interfaces and reusable UI for every platform.' },
  { id: 'vite', label: 'Vite', text: 'Fast dev server and optimized production builds for this portfolio.' },
  { id: 'javascript', label: 'JavaScript', text: 'The core language across the frontend and the Node backend.' },
  { id: 'node', label: 'Node.js', text: 'Server-side runtime powering the APIs and real-time features.' },
  { id: 'express', label: 'Express', text: 'Minimal, predictable routing and middleware for the REST layer.' },
  { id: 'rest', label: 'REST APIs', text: 'Clean HTTP contracts with validation, auth and rate limiting.' },
  { id: 'mongodb', label: 'MongoDB', text: 'Flexible document storage with tuned indexes for fast queries.' },
  { id: 'docker', label: 'Docker', text: 'Containerized services so every environment behaves the same.' },
  { id: 'nginx', label: 'Nginx', text: 'Reverse proxy and static serving in front of the application.' },
  { id: 'linux', label: 'Linux', text: 'Debian VPS hosting with process management and logging.' },
  { id: 'cicd', label: 'CI/CD', text: 'Automated builds and deploys so releases are a push, not a ritual.' },
  { id: 'ssl', label: 'Domains & SSL', text: 'DNS, custom domains and HTTPS certificates wired end to end.' },
]

export default function BuiltWith() {
  return (
    <section className="section" id="built-with">
      <Reveal>
        <header className="section-intro">
          <div>
            <span className="section-eyebrow"><Icon name="container" /> Build With</span>
            <h2>Built with a focused stack.</h2>
          </div>
          <p>
            The technologies behind this portfolio and the platforms I build — chosen so development, hosting and
            security all fit together without surprises.
          </p>
        </header>
      </Reveal>

      <div className="built-grid">
        {STACK.map(item => (
          <Reveal key={item.id}>
            <article className="built-card">
              <span
                className="built-icon tech-icon"
                style={techIconTint(item.label) ? { '--tech-tint': techIconTint(item.label) } : undefined}
                aria-hidden="true"
              >
                <TechIcon label={item.label} />
              </span>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="built-credits">
          <p>Designed &amp; built with React + Vite by Byiringiro Elie (M4STER).</p>
          <p>Design credits: Imanirumva Pacifique, Mukeshimana Kevin &amp; Pacifique.</p>
        </div>
      </Reveal>
    </section>
  )
}
