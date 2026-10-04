// ServicesPage.tsx — /services hub for the PlayBeat Digital "Business
// Solutions" section: hero, trust strip, categorized service grid, featured
// solutions, industries, why-us, process timeline, FAQ and final CTA.

import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Inbox,
} from 'lucide-react';
import {
  API_BASE,
  applySeo,
  BreadcrumbJsonLd,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  CATEGORY_ACCENTS,
  CHIP,
  CONTAINER,
  EYEBROW,
  FaqJsonLd,
  getIcon,
  H2,
  INDUSTRIES,
  navLink,
  PAGE_BG,
  PROCESS_STEPS,
  SECTION,
  SERVICE_CATEGORIES,
  SERVICES_FAQ,
  TRUST_STRIP,
  useApiResource,
  WHY_US,
} from './servicesContent';
import type { ServiceCategoryKey, ServiceLite } from './servicesContent';
import { ServicesTopBar, ServicesFooter } from './ServicesTopBar'

type NavigateFn = (path: string) => void;

export interface ServicesPageProps {
  /** Optional SPA navigation override (defaults to the go() helper). */
  onNavigate?: NavigateFn;
}

interface ServicesResponse {
  success: boolean;
  services: ServiceLite[];
}

const BREADCRUMB = [
  { name: 'Home', path: '/' },
  { name: 'Business Solutions', path: '/services' },
];

function ServicesPageBase({ onNavigate }: ServicesPageProps) {
  const { data, loading, error, retry } = useApiResource<ServicesResponse>(
    `${API_BASE}/api/services`,
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCat, setActiveCat] = useState<'all' | ServiceCategoryKey>('all');

  const services = useMemo<ServiceLite[]>(() => data?.services ?? [], [data]);

  // Marketplace grid: single visual flow (Dribbble-style), filterable by
  // category chips, featured solutions first.
  const visibleServices = useMemo(() => {
    const list =
      activeCat === 'all'
        ? services
        : services.filter((service) => service.category === activeCat);
    return [...list].sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) || a.displayOrder - b.displayOrder,
    );
  }, [services, activeCat]);

  const featured = useMemo(() => {
    const flagged = services.filter((service) => service.featured);
    const list = flagged.length > 0 ? flagged : services;
    return list.slice(0, 6);
  }, [services]);

  useEffect(() => {
    applySeo({
      title: 'Business Web, Software & Digital Solutions | PlayBeat Digital',
      description:
        'Explore business websites, custom applications, CRM systems, e-commerce solutions, automation, professional document design and digital archive systems from PlayBeat Digital.',
      canonical: 'https://playbeat.digital/services',
    });
  }, []);

  const scrollToGrid = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('services-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#050913] text-[#F2F5FA]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={PAGE_BG} />
      <div className="relative">
        <main>
          {/* ---------------------------------------------------------- Hero */}
          <header className="pt-14 sm:pt-20">
            <div className={CONTAINER}>
              <div className="max-w-3xl">
                <p className={EYEBROW}>PlayBeat Digital · Business Solutions</p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Technology Built Around Your Business
                </h1>
                <p className="mt-5 text-base leading-relaxed text-[#b7c2d6] sm:text-lg">
                  PlayBeat Digital designs and develops modern websites, business applications, CRM
                  systems, digital commerce platforms, automated workflows and enterprise tools
                  designed around real business operations.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a {...navLink('/services/request', onNavigate)} className={BTN_PRIMARY}>
                    Start Your Project
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a href="#services-grid" onClick={scrollToGrid} className={BTN_SECONDARY}>
                    Explore Services
                  </a>
                  <a
                    {...navLink('/contact', onNavigate)}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-[#8190a8] transition hover:text-white"
                  >
                    Contact Our Team
                  </a>
                </div>
              </div>

              {/* Trust strip — capabilities, no statistics */}
              <ul className="mt-12 flex flex-wrap gap-2.5 sm:mt-14" aria-label="What we deliver">
                {TRUST_STRIP.map((item) => (
                  <li key={item} className={CHIP}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3d8bff]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </header>

          {/* ------------------------------------------------- Services grid */}
          <section id="services-grid" className={SECTION} aria-labelledby="services-grid-title">
            <div className={CONTAINER}>
              <SectionHeader
                id="services-grid-title"
                eyebrow="Services"
                title="What We Build"
                description="Browse the full catalog of digital solutions — every card opens a full breakdown of scope, features and delivery."
              />

              {/* "What do you need?" — category filter chips (marketplace style) */}
              <div className="mb-7 flex flex-wrap items-center gap-2" role="group" aria-label="Filter services by category">
                <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8190a8]">
                  What do you need?
                </span>
                <FilterChip
                  active={activeCat === 'all'}
                  onClick={() => setActiveCat('all')}
                  label={`All Services${services.length ? ` (${services.length})` : ''}`}
                />
                {SERVICE_CATEGORIES.map((category) => {
                  const count = services.filter((s) => s.category === category.key).length;
                  return (
                    <FilterChip
                      key={category.key}
                      active={activeCat === category.key}
                      onClick={() => setActiveCat(category.key)}
                      label={count > 0 ? `${category.label} (${count})` : category.label}
                    />
                  );
                })}
              </div>

              {loading ? (
                <div
                  className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
                  aria-hidden="true"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <CardSkeleton key={index} />
                  ))}
                </div>
              ) : error ? (
                <ErrorPanel message={error} onRetry={retry} />
              ) : visibleServices.length === 0 ? (
                <EmptyPanel
                  title="No services in this category yet"
                  message="Our service catalog is being prepared. Please check back soon or contact our team directly."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {visibleServices.map((service) => (
                    <ServiceCard key={service.slug} service={service} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ----------------------------------------------------- Featured */}
          {!loading && !error && featured.length > 0 && (
            <section className={SECTION} aria-labelledby="featured-title">
              <div className={CONTAINER}>
                <SectionHeader
                  id="featured-title"
                  eyebrow="Featured"
                  title="Featured Business Solutions"
                  description="Popular solutions that businesses request most from PlayBeat Digital."
                />
                <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
                  {featured.map((service) => {
                    const Icon = getIcon(service.icon);
                    return (
                      <article key={service.slug} className={`${CARD} flex items-start gap-4 p-5 sm:p-6`}>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3d8bff]/10 text-[#3d8bff] ring-1 ring-[#3d8bff]/25">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-white break-words">{service.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-[#b7c2d6]">
                            {service.tagline || service.shortDescription}
                          </p>
                          <a
                            {...navLink(`/services/${service.slug}`, onNavigate)}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#3d8bff] transition hover:text-white"
                          >
                            Learn More
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* --------------------------------------------------- Industries */}
          <section className={SECTION} aria-labelledby="industries-title">
            <div className={CONTAINER}>
              <SectionHeader
                id="industries-title"
                eyebrow="Industries"
                title="Solutions Across Industries"
                description="Every project is scoped around real operations — these are common starting points per industry."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                {INDUSTRIES.map((industry) => {
                  const Icon = getIcon(industry.icon);
                  return (
                    <article key={industry.slug} className={`${CARD} p-5`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3d8bff]/10 text-[#3d8bff] ring-1 ring-[#3d8bff]/25">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-base font-semibold text-white">{industry.name}</h3>
                      <ul className="mt-3 space-y-1.5">
                        {industry.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-[13px] leading-relaxed text-[#8190a8]"
                          >
                            <span
                              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#3d8bff]"
                              aria-hidden="true"
                            />
                            <span className="break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                      {industry.slug === 'healthcare' && (
                        <p className="mt-3 rounded-lg border border-[rgba(148,170,210,.14)] bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-[#8190a8]">
                          Capabilities are implemented per project scope — no medical-compliance
                          claims are made.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------- Why us */}
          <section className={SECTION} aria-labelledby="why-title">
            <div className={CONTAINER}>
              <SectionHeader
                id="why-title"
                eyebrow="Why PlayBeat Digital"
                title="Designed Around Your Business"
                description="Not a template shop — systems and interfaces shaped by how your team actually works."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {WHY_US.map((point) => {
                  const Icon = getIcon(point.icon);
                  return (
                    <article key={point.name} className={`${CARD} p-6`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3d8bff]/10 text-[#3d8bff] ring-1 ring-[#3d8bff]/25">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-base font-semibold text-white">{point.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#b7c2d6]">{point.d}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------ Process */}
          <section className={SECTION} aria-labelledby="process-title">
            <div className={CONTAINER}>
              <SectionHeader
                id="process-title"
                eyebrow="Delivery Process"
                title="How We Build"
                description="A structured, transparent delivery process from first conversation to launch and beyond."
              />
              <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                {PROCESS_STEPS.map((step) => (
                  <li key={step.n} className={`${CARD} p-5`}>
                    <span className="font-mono text-xs tracking-[0.2em] text-[#3d8bff]">{step.n}</span>
                    <h3 className="mt-3 text-base font-semibold text-white">{step.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#8190a8]">{step.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ---------------------------------------------------------- FAQ */}
          <section className={SECTION} aria-labelledby="faq-title">
            <div className={CONTAINER}>
              <div className="max-w-3xl">
                <SectionHeader id="faq-title" eyebrow="FAQ" title="Frequently Asked Questions" />
                <FaqJsonLd />
                <BreadcrumbJsonLd items={BREADCRUMB} />
                <div className="overflow-hidden rounded-2xl border border-[rgba(148,170,210,.17)] bg-white/[0.03]">
                  {SERVICES_FAQ.map((entry, index) => {
                    const open = openFaq === index;
                    return (
                      <div
                        key={entry.q}
                        className={index > 0 ? 'border-t border-[rgba(148,170,210,.12)]' : ''}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(open ? null : index)}
                          aria-expanded={open}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02]"
                        >
                          <span className="text-sm font-medium text-white sm:text-[15px]">{entry.q}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[#3d8bff] transition-transform duration-200 ${
                              open ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                        {open && (
                          <p className="px-5 pb-5 text-sm leading-relaxed text-[#b7c2d6]">{entry.a}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------- Final CTA */}
          <section className="pb-20 sm:pb-28" aria-labelledby="cta-title">
            <div className={CONTAINER}>
              <div className="rounded-3xl border border-[#3d8bff]/25 bg-gradient-to-br from-[#2563eb]/15 via-white/[0.02] to-[#3d8bff]/10 px-6 py-12 text-center sm:px-12 sm:py-16">
                <h2 id="cta-title" className={H2}>
                  Have a Business Idea or Digital Project?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#b7c2d6]">
                  Tell us what you need and let PlayBeat Digital turn your requirements into a
                  structured digital solution.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <a {...navLink('/services/request', onNavigate)} className={BTN_PRIMARY}>
                    Request a Project
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a {...navLink('/contact', onNavigate)} className={BTN_SECONDARY}>
                    Contact PlayBeat Digital
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
 * Local building blocks
 * ========================================================================= */

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 max-w-2xl sm:mb-10">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 id={id} className={`mt-3 ${H2}`}>
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-[#8190a8]">{description}</p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
        active
          ? 'bg-[#3d8bff]/15 text-white ring-1 ring-[#3d8bff]/60'
          : 'bg-white/[0.04] text-[#b7c2d6] ring-1 ring-[rgba(148,170,210,.2)] hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function ServiceCard({
  service,
  onNavigate,
}: {
  service: ServiceLite;
  onNavigate?: NavigateFn;
}) {
  const Icon = getIcon(service.icon);
  const accent = CATEGORY_ACCENTS[service.category];

  return (
    <article className={`${CARD} group flex h-full flex-col overflow-hidden`}>
      {/* Cover — marketplace visual tile */}
      <a
        {...navLink(`/services/${service.slug}`, onNavigate)}
        className="relative block aspect-[16/9] overflow-hidden"
        aria-label={`${service.title} — view service`}
        style={{ background: accent.cover }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.75) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <Icon
          aria-hidden="true"
          className="absolute -bottom-7 -right-5 h-36 w-36 rotate-6 text-white/25 transition duration-300 group-hover:scale-110 group-hover:text-white/35"
        />
        <span className="absolute left-3.5 top-3.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
          {accent.label}
        </span>
        {service.featured ? (
          <span className="absolute right-3.5 top-3.5 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0b1222] shadow">
            Featured
          </span>
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-[#050913]/55 opacity-0 transition duration-200 group-hover:opacity-100">
          <span className="rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#0b1222] shadow-xl">
            View Service
          </span>
        </span>
      </a>

      {/* Body — title, one-liner, provider row (Dribbble card anatomy) */}
      <a
        {...navLink(`/services/${service.slug}`, onNavigate)}
        className="flex flex-1 flex-col p-5"
        aria-label={service.title}
      >
        <h3 className="text-[15.5px] font-semibold leading-snug text-white break-words transition group-hover:text-[#7db4ff]">
          {service.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#8190a8]">
          {service.tagline || service.shortDescription}
        </p>
        <div className="mt-auto flex items-center gap-2.5 border-t border-[rgba(148,170,210,.12)] pt-4">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow"
            style={{ background: accent.cover }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[13px] font-semibold text-white">
              <span className="truncate">PlayBeat Digital</span>
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#3d8bff]" aria-hidden="true" />
            </span>
            <span className="block text-[11px] text-[#8190a8]">Business Solutions Team</span>
          </span>
          <span className="ml-auto shrink-0 text-[13px] font-bold text-white">Custom Quote</span>
        </div>
      </a>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[rgba(148,170,210,.12)] bg-white/[0.03] p-0 overflow-hidden">
      <div className="aspect-[16/9] animate-pulse bg-white/[0.06]" />
      <div className="p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="mt-1.5 h-3 w-5/6 animate-pulse rounded bg-white/[0.05]" />
        <div className="mt-5 flex items-center gap-2.5 border-t border-[rgba(148,170,210,.12)] pt-4">
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-3 w-28 animate-pulse rounded bg-white/[0.05]" />
          <div className="ml-auto h-3 w-16 animate-pulse rounded bg-white/[0.05]" />
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-red-500/25 bg-red-500/[0.06] px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-white">Something went wrong</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#b7c2d6] break-words">{message}</p>
      <button type="button" onClick={onRetry} className={`${BTN_PRIMARY} mt-6`}>
        Try Again
      </button>
    </div>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[rgba(148,170,210,.17)] bg-white/[0.03] px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-[#3d8bff]" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#8190a8]">{message}</p>
    </div>
  );
}


export function ServicesPage() {
  return (
    <>
      <ServicesTopBar />
      <ServicesPageBase  />
      <ServicesFooter />
    </>
  )
}
export default ServicesPage;
