// Admin motion runtime for the vendored CSS libraries (all scoped under .pbadmin).
//
// - AOS engine for src/admin/vendor-scoped.css aos.css section: an
//   IntersectionObserver adds `.aos-animate` to `.pbadmin [data-aos]`
//   elements when they enter the viewport (once, like AOS default).
// - animate.css v3 engine: newly mounted admin modal overlays get
//   `animated fadeIn` on the backdrop + `animated fadeInUp am-fast` on the
//   modal card (v3 naming — the uploaded animate.css is 3.7.0).
//
// No JS dependencies. Idempotent singleton observing document.body — when
// the admin shell (.pbadmin) is absent (storefront routes) every callback
// exits early, so the storefront is never touched.
//
// Safety: prefers-reduced-motion OR missing IntersectionObserver → no
// observers; instead a style override forces [data-aos] visible so nothing
// can ever remain hidden because of the AOS CSS.

let started = false

const REDUCED = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Force AOS elements visible (reduced-motion / no-IO fallback). */
function injectAosOverride() {
  if (document.getElementById('pa-aos-override')) return
  const style = document.createElement('style')
  style.id = 'pa-aos-override'
  style.textContent =
    '.pbadmin [data-aos]{opacity:1!important;transform:none!important;transition:none!important}' +
    '.pbadmin .animated{animation:none!important}'
  document.head.appendChild(style)
}

/** rAF-throttled sweep: reveal [data-aos] in view + animate new modals. */
export function initAdminMotion(): void {
  if (started || typeof window === 'undefined') return
  started = true

  if (REDUCED() || typeof IntersectionObserver === 'undefined') {
    injectAosOverride()
    return
  }

  // tiny duration helper for modal entrances (animate.css v3 default is 1s — too slow)
  if (!document.getElementById('pa-motion-helpers')) {
    const style = document.createElement('style')
    style.id = 'pa-motion-helpers'
    style.textContent = '.pbadmin .am-fast{animation-duration:.28s;animation-fill-mode:both}'
    document.head.appendChild(style)
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('aos-animate')
          io.unobserve(e.target)
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  )

  const reveal = (rootEl: ParentNode) => {
    rootEl.querySelectorAll?.('.pbadmin [data-aos]:not(.aos-animate)').forEach((el) => io.observe(el))
  }

  /** Tag freshly mounted admin modal overlays with animate.css v3 classes. */
  const bindModals = (added: HTMLElement[]) => {
    for (const node of added) {
      if (node.dataset?.amBound) continue
      if (!(node.classList?.contains('fixed') && node.classList?.contains('inset-0'))) continue
      if (!node.closest('.pbadmin')) continue
      node.dataset.amBound = '1'
      node.classList.add('animated', 'fadeIn', 'am-fast')
      const card = node.firstElementChild as HTMLElement | null
      if (card && !card.dataset.amBound) {
        card.dataset.amBound = '1'
        card.classList.add('animated', 'fadeInUp', 'am-fast')
      }
    }
  }

  let scheduled = false
  const sweep = () => {
    scheduled = false
    const shell = document.querySelector('.pbadmin')
    if (!shell) return
    reveal(shell)
  }
  const schedule = () => {
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(sweep)
    }
  }

  const mo = new MutationObserver((muts) => {
    const added: HTMLElement[] = []
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) added.push(n as HTMLElement)
      })
    }
    if (!added.length) return
    bindModals(added)
    schedule()
  })
  mo.observe(document.body, { childList: true, subtree: true })

  // initial sweep after the admin shell paints
  requestAnimationFrame(sweep)
  window.setTimeout(sweep, 600)
}
