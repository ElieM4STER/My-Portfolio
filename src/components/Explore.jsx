import Reveal from './Reveal'
import Icon from './Icons'

const PAGES = [
  {
    href: '#home',
    icon: 'laptop',
    tone: 'var(--ic-home)',
    title: 'Home',
    text: 'The welcome page — who I am, what I do, and a quick way into the rest of the portfolio.',
  },
  {
    href: '#about',
    icon: 'pin',
    tone: 'var(--ic-about)',
    title: 'About',
    text: 'My story, background and the way I approach building secure, production-ready platforms.',
  },
  {
    href: '#skills',
    icon: 'code',
    tone: 'var(--ic-skills)',
    title: 'Skills',
    text: 'The languages, frameworks and tools I use across frontend, backend, security and hosting.',
  },
  {
    href: '#projects',
    icon: 'rocket',
    tone: 'var(--ic-projects)',
    title: 'Projects',
    text: 'Real systems I have designed, built and shipped — with the stack and outcome for each.',
  },
  {
    href: '#services',
    icon: 'cogs',
    tone: 'var(--ic-services)',
    title: 'Services',
    text: 'What I offer: API development, platform hosting, deployment, maintenance and security.',
  },
  {
    href: '#experience',
    icon: 'briefcase',
    tone: 'var(--ic-experience)',
    title: 'Experience',
    text: 'A timeline of roles, freelance work and the milestones that shaped my practice.',
  },
  {
    href: '#testimonials',
    icon: 'chat',
    tone: 'var(--ic-testimonials)',
    title: 'Testimonials',
    text: 'What clients and collaborators say about working with me on their projects.',
  },
  {
    href: '#blog',
    icon: 'terminal',
    tone: 'var(--ic-blog)',
    title: 'Blog',
    text: 'Notes and write-ups on development, security, hosting and lessons from the field.',
  },
  {
    href: '#built-with',
    icon: 'container',
    tone: 'var(--ic-built-with)',
    title: 'Built With',
    text: 'The exact stack and tooling behind this portfolio and the platforms I deliver.',
  },
  {
    href: '#contact',
    icon: 'mail',
    tone: 'var(--ic-contact)',
    title: 'Contact',
    text: 'Start a project, ask a question, or reach me directly by email, WhatsApp or a video call.',
  },
]

export default function Explore() {
  return (
    <section className="section" id="explore">
      <Reveal>
        <header className="section-intro">
          <div>
            <span className="section-eyebrow"><Icon name="compass" /> Explore</span>
            <h2>Find your way around.</h2>
          </div>
          <p>Every part of the portfolio lives on its own page. Pick a section below to jump straight to it.</p>
        </header>
      </Reveal>

      <div className="explore-grid">
        {PAGES.map((page, index) => (
          <Reveal key={page.href}>
            <a className="explore-card" href={page.href}>
              <div className="explore-card-top">
                <span className="explore-icon" style={{ '--tone': page.tone }} aria-hidden="true"><Icon name={page.icon} /></span>
                <span className="explore-index">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{page.title}</h3>
              <p>{page.text}</p>
              <span className="explore-link">Open page <Icon name="external" /></span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
