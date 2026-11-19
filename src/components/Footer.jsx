import Icon from './Icons'
import { socialLinks } from '../lib/socials'

const SOCIALS = socialLinks

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a href="#home" className="footer-logo">
            <span>[</span>M4STER<span>]</span><i>_</i>
          </a>
          <p>
            Full-stack developer and cybersecurity analyst building functional, production-ready systems from
            Kigali, Rwanda.
          </p>
        </div>

        <div className="footer-connect">
          <div className="footer-socials">
            {SOCIALS.map(item => (
              <a
                key={item.id}
                href={item.href}
                aria-label={`${item.label}: ${item.value}`}
                title={`${item.label} — ${item.value}`}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Byiringiro Elie (M4STER)</span>
        <span>Designed &amp; built with React + Vite — Design credits: Imanirumva Pacifique, Mukeshimana Kevin &amp; Pacifique</span>
      </div>
    </footer>
  )
}
