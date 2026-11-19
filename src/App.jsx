import { lazy, Suspense, useEffect, useState } from 'react'
import Loader from './components/Loader'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Services from './components/Services'
import Experience from './components/Experience'
import Testimonials from './components/Testimonials'
import Skills from './components/Skills'
import Blog from './components/Blog'
import Contact from './components/Contact'
import Explore from './components/Explore'
import BuiltWith from './components/BuiltWith'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import BackToTop from './components/BackToTop'

const Admin = lazy(() => import('./components/Admin'))

const readRoute = () => window.location.hash.replace(/^#/, '')

export default function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let visitor = Math.random().toString(36).slice(2, 12)
    try {
      const stored = localStorage.getItem('portfolio-visitor')
      if (stored) visitor = stored
      else localStorage.setItem('portfolio-visitor', visitor)
    } catch {
      /* storage unavailable — use the random id */
    }
    fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor, path: window.location.hash || '/', referrer: document.referrer }),
    }).catch(() => {})
  }, [])

  if (route === '/admin') {
    return (
      <Suspense
        fallback={
          <main className="admin-shell">
            <p className="form-note">Loading admin console…</p>
          </main>
        }
      >
        <Admin />
      </Suspense>
    )
  }

  return (
    <>
      <div className="shooting-stars" aria-hidden="true" />
      <Loader />
      <Navbar />
      <main className="page-shell page-home">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Services />
        <Experience />
        <Testimonials />
        <Blog />
        <Explore />
        <BuiltWith />
        <Contact />
      </main>
      <Footer />
      <ChatWidget />
      <BackToTop />
    </>
  )
}
