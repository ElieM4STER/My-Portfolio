import { useEffect, useState } from 'react'
import Icon from './Icons'

const THEME_KEY = 'portfolio-theme'
const isTheme = value => value === 'dark' || value === 'light'

const MAIN_LINKS = [
  { href: '#home', icon: 'home', label: 'Home' },
  { href: '#about', icon: 'user', label: 'About' },
  { href: '#skills', icon: 'code', label: 'Skills' },
  { href: '#projects', icon: 'rocket', label: 'Projects' },
  { href: '#blog', icon: 'terminal', label: 'Blog' },
  { href: '#contact', icon: 'mail', label: 'Contact' },
]

const DROPDOWN_LINKS = [
  { href: '#services', icon: 'cogs', label: 'Services' },
  { href: '#experience', icon: 'briefcase', label: 'Experience' },
  { href: '#testimonials', icon: 'chat', label: 'Testimonials' },
  { href: '#explore', icon: 'compass', label: 'Explore' },
  { href: '#built-with', icon: 'container', label: 'Build With' },
]

const SECTION_IDS = MAIN_LINKS.map(link => link.href.slice(1))

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState('home')
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  const closeMenus = () => {
    setOpen(false)
    setAboutOpen(false)
    setMoreOpen(false)
  }

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)

      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)

      let current = SECTION_IDS[0]
      const offset = 140
      for (const id of SECTION_IDS) {
        const node = document.getElementById(id)
        if (node && node.getBoundingClientRect().top <= offset) current = id
      }
      if (window.innerHeight + window.scrollY >= el.scrollHeight - 2) {
        current = SECTION_IDS[SECTION_IDS.length - 1]
      }
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const selectedTheme = isTheme(theme) ? theme : 'light'
    document.documentElement.dataset.theme = selectedTheme
    localStorage.setItem(THEME_KEY, selectedTheme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      selectedTheme === 'dark' ? '#11110f' : '#faf9f4',
    )
  }, [theme])

  useEffect(() => {
    const syncTheme = event => {
      if (event.key === THEME_KEY && isTheme(event.newValue)) setTheme(event.newValue)
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  useEffect(() => {
    if (!open && !aboutOpen && !moreOpen) return undefined
    const onKey = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        setAboutOpen(false)
        setMoreOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, aboutOpen, moreOpen])

  return (
    <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      <div className="nav-inner">
        <a href="#home" className="logo" onClick={closeMenus}>
          <span className="logo-bracket">[</span>
          <span className="logo-path">M4STER</span>
          <span className="logo-bracket">]</span>
          <span className="logo-cursor" aria-hidden="true">_</span>
        </a>
        <nav className={`nav-links${open ? ' open' : ''}`}>
          {MAIN_LINKS.map(link =>
            link.label === 'About' ? (
              <div
                key={link.href}
                className={`nav-drop${aboutOpen ? ' open' : ''}`}
                onMouseEnter={() => setAboutOpen(true)}
                onMouseLeave={() => setAboutOpen(false)}
              >
                <a
                  href={link.href}
                  className={`nav-link nav-link-drop${active === 'about' ? ' active' : ''}`}
                  data-tone={link.icon}
                  aria-expanded={aboutOpen}
                  onClick={() => {
                    setOpen(false)
                    setAboutOpen(true)
                  }}
                >
                  <Icon name={link.icon} />
                  {link.label}
                  <Icon name="chevronDown" className="nav-caret" />
                </a>
                <div className="nav-dropdown" role="menu" aria-label="Sections inside About">
                  <div className="nav-dropdown-grid">
                    {DROPDOWN_LINKS.map(item => (
                      <a
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`nav-dropdown-item${active === item.href.slice(1) ? ' active' : ''}`}
                        data-tone={item.icon}
                        onClick={closeMenus}
                      >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                      </a>
                    ))}
                    <a
                      href="#about"
                      role="menuitem"
                      className={`nav-dropdown-item nav-dropdown-about${active === 'about' ? ' active' : ''}`}
                      data-tone="user"
                      onClick={closeMenus}
                    >
                      <Icon name="user" />
                      <span>About me</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link${active === link.href.slice(1) ? ' active' : ''}`}
                data-tone={link.icon}
                onClick={closeMenus}
              >
                <Icon name={link.icon} />
                {link.label}
              </a>
            ),
          )}
        </nav>
        {open && (
          <button
            className="nav-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenus}
          ></button>
        )}
        <div className="nav-actions">
          <div className="nav-more">
            <button
              className={`more-toggle${moreOpen ? ' open' : ''}`}
              type="button"
              onClick={() => {
                setMoreOpen(m => !m)
                setOpen(false)
                setAboutOpen(false)
              }}
              aria-label="More options"
              aria-expanded={moreOpen}
              title="More options"
            >
              <Icon name="dots" />
            </button>
            {moreOpen && (
              <>
                <button
                  className="nav-backdrop nav-backdrop-more"
                  type="button"
                  aria-label="Close more menu"
                  onClick={() => setMoreOpen(false)}
                ></button>
                <div className="more-menu" role="menu" aria-label="More options">
                  <a
                    href="#/admin"
                    role="menuitem"
                    className="more-item"
                    data-tone="lock"
                    onClick={closeMenus}
                  >
                    <Icon name="lock" />
                    <span>Admin Dashboard</span>
                  </a>
                </div>
              </>
            )}
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            aria-pressed={theme === 'light'}
            title={`Switch to ${nextTheme} mode`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            className={`hamburger${open ? ' open' : ''}`}
            type="button"
            onClick={() => {
              setOpen(o => !o)
              setAboutOpen(false)
            }}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  )
}