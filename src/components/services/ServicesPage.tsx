// ServicesPage.tsx — /services section mount for the owner's "Services —
// PlayBeat Digital v2" design. Renders the artifact shell (floating nav +
// mega menu + mobile sheet + command palette + WhatsApp float + footer) and
// drives the ported engine with real storefront paths. Leads submitted from
// the project builder POST to the real /api/service-requests pipeline.

import { useEffect } from 'react'
import {
  pbsvInit,
  pbsvRoute,
  pbsvSetPath,
  pbsvSetApi,
  pbsvSetSvcMap,
  pbsvTeardown,
} from './engine'
import { ENGINE_CSS } from './engineCss'
import { API_BASE, applySeo, go } from './servicesContent'

/** Package category → valid /api/service-requests `service` option. */
const SVC_MAP: Record<string, string> = {
  web: 'Website Development',
  app: 'Web Application',
  saas: 'Web Application',
  mob: 'Custom Software',
  eco: 'E-Commerce',
  shp: 'E-Commerce',
  wf: 'Website Development',
  fr: 'Website Development',
  dash: 'Business Application',
  ux: 'UI/UX',
  brand: 'Graphic Design',
  logo: 'Graphic Design',
  ill: 'Graphic Design',
  ent: 'Custom Software',
}

/** window.location → engine view path (artifact home lives at engine root) */
function enginePath(): string {
  if (typeof window === 'undefined') return '/'
  const p = window.location.pathname.toLowerCase()
  const q = window.location.search
  if (p === '/services') return q ? '/services' + q : '/'
  if (p.startsWith('/services/package/')) return '/services/' + decodeURIComponent(p.split('/')[3] || '')
  if (p.startsWith('/services/demo/')) return '/demo/' + decodeURIComponent(p.split('/')[3] || '')
  if (p === '/services/demos') return '/demos'
  if (p.startsWith('/services/build')) return '/build' + q
  if (p === '/services/company') return '/company'
  return '/'
}

function seoFor(): { title: string; description: string; canonical: string } {
  const p = window.location.pathname.toLowerCase()
  const base = 'https://playbeat.digital'
  if (p.startsWith('/services/package/')) {
    const slug = decodeURIComponent(p.split('/')[3] || '')
    return {
      title: 'Business Solutions — PlayBeat Digital',
      description:
        'Premium websites, apps, SaaS platforms, ecommerce systems and enterprise software with live demos before you order.',
      canonical: base + '/services/package/' + slug,
    }
  }
  if (p.startsWith('/services/demo/')) {
    const slug = decodeURIComponent(p.split('/')[3] || '')
    return {
      title: 'Live demo — PlayBeat Digital',
      description: 'Interactive demo experiences you can try before you order.',
      canonical: base + '/services/demo/' + slug,
    }
  }
  if (p.startsWith('/services/build')) {
    return {
      title: 'Build your project — PlayBeat Digital',
      description:
        'Choose a service, package and timeline — get an estimated range straight away and a formal proposal after we talk.',
      canonical: base + '/services/build',
    }
  }
  if (p === '/services/demos') {
    return {
      title: 'Live demos — PlayBeat Digital',
      description: 'Working examples across websites, SaaS, ecommerce, dashboards, mobile and brand.',
      canonical: base + '/services/demos',
    }
  }
  if (p === '/services/company') {
    return {
      title: 'Company — PlayBeat Digital',
      description: 'PlayBeat Digital is a product studio — websites, apps, SaaS platforms, ecommerce and brand systems.',
      canonical: base + '/services/company',
    }
  }
  return {
    title: 'PlayBeat Digital — Websites, apps and SaaS with live demos',
    description:
      'Premium websites, apps, SaaS platforms, ecommerce systems and enterprise software, with interactive demos you can try before you order.',
    canonical: base + '/services',
  }
}

export function ServicesPage() {
  useEffect(() => {
    // Inject scoped engine CSS once
    if (!document.getElementById('pbsv-style')) {
      const style = document.createElement('style')
      style.id = 'pbsv-style'
      style.textContent = ENGINE_CSS
      document.head.appendChild(style)
    }
    pbsvSetApi(API_BASE)
    pbsvSetSvcMap(SVC_MAP)
    pbsvSetPath(enginePath())
    pbsvInit()

    const onPop = () => {
      pbsvSetPath(enginePath())
      pbsvRoute()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      pbsvTeardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-route when the section route changes within the SPA
  useEffect(() => {
    pbsvSetPath(enginePath())
    pbsvRoute()
    const seo = seoFor()
    applySeo(seo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  return (
    <div className="pbsv-root">
      {/* ----------------------------------------------------- Floating nav */}
      <header className="nav ink" id="nav">
        <div className="nav-in">
          <a
            className="logo"
            href="#/"
            aria-label="PlayBeat Digital home"
            onClick={(e) => { e.preventDefault(); go('/services') }}
          >
            <i />PlayBeat <span>Digital</span>
          </a>
          <a className="nl" id="nsv" data-k="services" href="#/services" aria-haspopup="true" aria-expanded="false">
            Services{' '}
            <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </a>
          <a className="nl" data-k="solutions" href="#/solutions">Solutions</a>
          <a className="nl" data-k="demos" href="#/demos">Demos</a>
          <a className="nl" data-k="industries" href="#/industries">Industries</a>
          <a className="nl" data-k="pricing" href="#/pricing">Pricing</a>
          <a className="nl" data-k="company" href="#/company">Company</a>
          <button className="nav-s" data-cmd aria-label="Search services, demos and industries">
            <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></svg>
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
          <a className="btn btn-p sm" data-wa="" href="#" target="_blank" rel="noopener">Talk to us</a>
          <button className="nav-m" id="nmenu" aria-label="Open menu">
            <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
        <div className="mega" id="mega" />
      </header>

      {/* ----------------------------------------------------- Mobile sheet */}
      <div className="sheet-nav" id="sheet">
        <button className="sheet-x" id="sheetx" aria-label="Close menu">
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <a href="#/services">Services</a>
        <a href="#/solutions">Solutions</a>
        <a href="#/demos">Demos</a>
        <a href="#/industries">Industries</a>
        <a href="#/pricing">Pricing</a>
        <a href="#/company">Company</a>
        <a href="#/build">Project builder</a>
        <a className="btn btn-p" data-wa="" href="#" target="_blank" rel="noopener">Talk to us on WhatsApp</a>
      </div>

      {/* --------------------------------------------------------- App view */}
      <main id="app" />

      {/* ----------------------------------------------------------- Footer */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              <a className="logo" href="#/" onClick={(e) => { e.preventDefault(); go('/services') }}>
                <i />PlayBeat <span>Digital</span>
              </a>
              <p style={{ maxWidth: '36ch' }}>
                Websites, apps, SaaS and brand systems, with a working demo before you commit.
              </p>
            </div>
            <div>
              <h4>Build</h4>
              <a href="#/services?g=web">Websites</a>
              <a href="#/services?g=saas">SaaS &amp; web apps</a>
              <a href="#/services?g=mob">Mobile apps</a>
              <a href="#/services?g=eco">Ecommerce</a>
            </div>
            <div>
              <h4>Explore</h4>
              <a href="#/demos">Live demos</a>
              <a href="#/process">How we work</a>
              <a href="#/pricing">Pricing</a>
              <a href="#/build">Project builder</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#/company">About PlayBeat</a>
              <a data-wa="" href="#" target="_blank" rel="noopener">WhatsApp +92 332 1029333</a>
              <a href="https://playbeat.digital" target="_blank" rel="noopener">playbeat.digital</a>
            </div>
          </div>
          <div className="fine">
            <p>
              Demo interfaces are illustrative examples created by PlayBeat Digital to demonstrate
              design and development capabilities. Final client projects are customized to their
              requirements.
            </p>
            <span>© PlayBeat Digital (Private) Limited</span>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------- WhatsApp float */}
      <a className="wa" id="wa" href="#" target="_blank" rel="noopener" aria-label="Discuss your project on WhatsApp">
        <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z" /></svg>
        <span>Discuss your project</span>
      </a>

      {/* --------------------------------------------------- Command palette */}
      <div className="cmd" id="cmd" role="dialog" aria-modal="true" aria-label="Search">
        <div className="cmd-b">
          <div className="cmd-i">
            <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></svg>
            <input id="cq" type="text" placeholder="Search services, demos and industries" aria-label="Search" autoComplete="off" />
            <kbd>Esc</kbd>
          </div>
          <div className="cmd-r" id="cr" />
        </div>
      </div>
    </div>
  )
}

export default ServicesPage
