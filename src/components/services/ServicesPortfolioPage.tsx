// ServicesPortfolioPage.tsx — "Case Studies & Portfolio" page for the
// PlayBeat Digital Business Solutions section. Fetches published case studies
// and renders them as a responsive card grid with skeleton / error / empty
// states.

import { useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  TrendingUp,
} from 'lucide-react';
import {
  API_BASE,
  applySeo,
  BreadcrumbJsonLd,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  CHIP,
  CONTAINER,
  EYEBROW,
  navLink,
  PAGE_BG,
  useApiResource,
} from './servicesContent';
import type { BreadcrumbItem, PortfolioItem } from './servicesContent';
import { ServicesTopBar, ServicesFooter } from './ServicesTopBar'

type NavigateFn = (path: string) => void;

export interface ServicesPortfolioPageProps {
  /** Optional SPA navigation override (defaults to the go() helper). */
  onNavigate?: NavigateFn;
}

interface PortfolioResponse {
  success: boolean;
  portfolio: PortfolioItem[];
}

const BREADCRUMB: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Business Solutions', path: '/services' },
  { name: 'Portfolio', path: '/services/portfolio' },
];

function ServicesPortfolioPageBase({ onNavigate }: ServicesPortfolioPageProps) {
  const { data, loading, error, retry } = useApiResource<PortfolioResponse>(
    `${API_BASE}/api/services/portfolio`,
  );

  const items = data?.portfolio ?? [];

  useEffect(() => {
    applySeo({
      title: 'Business Solutions Portfolio | PlayBeat Digital',
      description:
        'Case studies from PlayBeat Digital: business websites, web applications, CRM systems, e-commerce platforms, automation and internal tools built around real business operations.',
      canonical: 'https://playbeat.digital/services/portfolio',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#050913] text-[#F2F5FA]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={PAGE_BG} />
      <div className="relative">
        <main>
          <BreadcrumbJsonLd items={BREADCRUMB} />

          {/* ------------------------------------------------------- Header */}
          <header className="pt-14 sm:pt-20">
            <div className={CONTAINER}>
              <div className="max-w-3xl">
                <p className={EYEBROW}>Case Studies</p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Case Studies &amp; Portfolio
                </h1>
                <p className="mt-5 text-base leading-relaxed text-[#b7c2d6] sm:text-lg">
                  A look at the websites, business applications and digital systems PlayBeat Digital
                  has delivered for real business operations.
                </p>
              </div>
            </div>
          </header>

          {/* --------------------------------------------------------- Grid */}
          <section className="pb-20 pt-10 sm:pb-28 sm:pt-14" aria-labelledby="portfolio-grid-title">
            <div className={CONTAINER}>
              <h2 id="portfolio-grid-title" className="sr-only">
                Published case studies
              </h2>

              {loading ? (
                <div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
                  aria-hidden="true"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <CardSkeleton key={index} />
                  ))}
                </div>
              ) : error ? (
                <ErrorPanel message={error} onRetry={retry} />
              ) : items.length === 0 ? (
                <EmptyPanel />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {items.map((item) => (
                    <PortfolioCard key={item.slug} item={item} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ----------------------------------------------------- Bottom CTA */}
          <section className="pb-20 sm:pb-28" aria-labelledby="portfolio-cta-title">
            <div className={CONTAINER}>
              <div className="rounded-3xl border border-[#3d8bff]/25 bg-gradient-to-br from-[#2563eb]/15 via-white/[0.02] to-[#3d8bff]/10 px-6 py-12 text-center sm:px-12">
                <h2 id="portfolio-cta-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Need a Similar Solution?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#b7c2d6] sm:text-base">
                  Every project starts with a conversation about your goals, users and workflows.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a {...navLink('/services/request', onNavigate)} className={BTN_PRIMARY}>
                    Request a Project
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a {...navLink('/services', onNavigate)} className={BTN_SECONDARY}>
                    Explore Services
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

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <article className={`${CARD} flex h-full flex-col p-5 sm:p-6`}>
      <div className="flex flex-wrap gap-2">
        <span className={CHIP}>{item.industry}</span>
        <span className={CHIP}>{item.service}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-white break-words">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#b7c2d6]">{item.description}</p>
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#3d8bff]/20 bg-[#3d8bff]/[0.06] px-3.5 py-2.5">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#3d8bff]" aria-hidden="true" />
        <p className="text-[13px] leading-relaxed text-[#b7c2d6] break-words">{item.results}</p>
      </div>
      {item.clientName ? (
        <p className="mt-3 text-[13px] text-[#8190a8]">
          Client: <span className="text-[#b7c2d6] break-words">{item.clientName}</span>
        </p>
      ) : null}
      <p className="mt-auto border-t border-[rgba(148,170,210,.12)] pt-3 font-mono text-[11px] leading-relaxed text-[#8190a8] break-words">
        {item.techSummary}
      </p>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[rgba(148,170,210,.12)] bg-white/[0.03] p-6">
      <div className="flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-white/[0.06]" />
      </div>
      <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/[0.05]" />
      <div className="mt-1.5 h-3 w-5/6 animate-pulse rounded bg-white/[0.05]" />
      <div className="mt-4 h-12 w-full animate-pulse rounded-xl bg-white/[0.05]" />
      <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
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

function EmptyPanel() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[rgba(148,170,210,.17)] bg-white/[0.03] px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-[#3d8bff]" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-white">No case studies published yet</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#8190a8]">
        Selected project case studies will appear here as they are published.
      </p>
    </div>
  );
}


export function ServicesPortfolioPage() {
  return (
    <>
      <ServicesTopBar />
      <ServicesPortfolioPageBase  />
      <ServicesFooter />
    </>
  )
}
export default ServicesPortfolioPage;
