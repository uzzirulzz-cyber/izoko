// ServiceDetailPage.tsx — generic detail page for one Business Solution
// service (fetched by slug): breadcrumb, hero, sticky summary card, content
// sections, key features and related services.

import { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  SearchX,
} from 'lucide-react';
import {
  API_BASE,
  applySeo,
  BreadcrumbJsonLd,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  categoryLabel,
  CHIP,
  CONTAINER,
  EYEBROW,
  getIcon,
  navLink,
  PAGE_BG,
  ServiceJsonLd,
  SITE_URL,
  useApiResource,
} from './servicesContent';
import type { BreadcrumbItem, ServiceFull, ServiceLite } from './servicesContent';
import { ServicesTopBar, ServicesFooter } from './ServicesTopBar'

type NavigateFn = (path: string) => void;

export interface ServiceDetailPageProps {
  slug: string;
  /** Optional SPA navigation override (defaults to the go() helper). */
  onNavigate?: NavigateFn;
}

interface ServiceResponse {
  success: boolean;
  service: ServiceFull;
}

interface ServicesListResponse {
  success: boolean;
  services: ServiceLite[];
}

function ServiceDetailPageBase({ slug, onNavigate }: ServiceDetailPageProps) {
  const { data, loading, error, errorStatus, retry } = useApiResource<ServiceResponse>(
    `${API_BASE}/api/services/${encodeURIComponent(slug)}`,
  );
  // Secondary fetch — powers the "Related Services" block (hidden on failure).
  const list = useApiResource<ServicesListResponse>(`${API_BASE}/api/services`);

  const service = data?.service ?? null;
  const Icon = getIcon(service?.icon);

  useEffect(() => {
    if (!service) return;
    applySeo({
      title: `${service.seoTitle || service.title} | PlayBeat Digital`,
      description: service.seoDescription || service.shortDescription,
      canonical: `${SITE_URL}/services/${service.slug}`,
    });
  }, [service]);

  const related = useMemo(() => {
    const all = list.data?.services ?? [];
    if (!service || all.length === 0) return [];
    const others = all.filter((item) => item.slug !== service.slug);
    const sameCategory = others.filter((item) => item.category === service.category);
    const rest = others.filter((item) => item.category !== service.category);
    return [...sameCategory, ...rest].slice(0, 3);
  }, [list.data, service]);

  const breadcrumb = useMemo<BreadcrumbItem[]>(
    () => [
      { name: 'Home', path: '/' },
      { name: 'Business Solutions', path: '/services' },
      ...(service ? [{ name: service.title }] : []),
    ],
    [service],
  );

  const requestHref = service
    ? `/services/request?service=${encodeURIComponent(service.title)}`
    : '/services/request';

  const isNotFound = !loading && ((error !== null && errorStatus === 404) || (error === null && service === null));
  const isError = !loading && error !== null && errorStatus !== 404;

  return (
    <div className="min-h-screen bg-[#050913] text-[#F2F5FA]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={PAGE_BG} />
      <div className="relative">
        <main>
          {service ? <ServiceJsonLd service={service} /> : null}
          <BreadcrumbJsonLd items={breadcrumb} />
          <div className={CONTAINER}>
            {loading && <DetailSkeleton />}
            {isNotFound && <NotFoundState onNavigate={onNavigate} />}
            {isError && (
              <div className="py-20 sm:py-28">
                <ErrorPanel message={error ?? 'Something went wrong.'} onRetry={retry} />
              </div>
            )}

            {service && (
              <>
                {/* ------------------------------------------------ Breadcrumb */}
                <nav aria-label="Breadcrumb" className="pt-6">
                  <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#8190a8]">
                    <li>
                      <a {...navLink('/', onNavigate)} className="transition hover:text-white">
                        Home
                      </a>
                    </li>
                    <li aria-hidden="true">
                      <ChevronRight className="h-3.5 w-3.5 text-[#8190a8]/60" />
                    </li>
                    <li>
                      <a {...navLink('/services', onNavigate)} className="transition hover:text-white">
                        Business Solutions
                      </a>
                    </li>
                    <li aria-hidden="true">
                      <ChevronRight className="h-3.5 w-3.5 text-[#8190a8]/60" />
                    </li>
                    <li aria-current="page" className="text-[#b7c2d6] break-words">
                      {service.title}
                    </li>
                  </ol>
                </nav>

                {/* ------------------------------------------------- Hero grid */}
                <div className="grid items-start gap-10 pb-2 pt-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
                  <div className="min-w-0">
                    <p className={EYEBROW}>{categoryLabel(service.category)}</p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight text-white break-words sm:text-5xl">
                      {service.title}
                    </h1>
                    {service.tagline ? (
                      <p className="mt-4 text-lg font-medium text-[#3d8bff] break-words">{service.tagline}</p>
                    ) : null}
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#b7c2d6] sm:text-lg">
                      {service.shortDescription}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <a {...navLink(requestHref, onNavigate)} className={BTN_PRIMARY}>
                        {service.ctaLabel || 'Request a Quote'}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                      <a {...navLink('/contact', onNavigate)} className={BTN_SECONDARY}>
                        Contact Our Team
                      </a>
                    </div>
                  </div>

                  {/* Sticky summary card (desktop) */}
                  <aside className="lg:sticky lg:top-8">
                    <div className={`${CARD} p-6`}>
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3d8bff]/10 text-[#3d8bff] ring-1 ring-[#3d8bff]/25">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <h2 className="mt-4 text-base font-semibold text-white break-words">
                        {service.title}
                      </h2>
                      <p className="mt-2">
                        <span className={CHIP}>{categoryLabel(service.category)}</span>
                      </p>
                      <div className="mt-5 space-y-2.5">
                        <a {...navLink(requestHref, onNavigate)} className={`${BTN_PRIMARY} w-full`}>
                          {service.ctaLabel || 'Request a Quote'}
                        </a>
                        <a {...navLink('/contact', onNavigate)} className={`${BTN_SECONDARY} w-full`}>
                          Contact Our Team
                        </a>
                      </div>
                      <p className="mt-5 border-t border-[rgba(148,170,210,.14)] pt-4 text-[13px] leading-relaxed text-[#8190a8]">
                        Have questions?{' '}
                        <a
                          {...navLink('/contact', onNavigate)}
                          className="font-medium text-[#3d8bff] transition hover:text-white"
                        >
                          Contact our team
                        </a>{' '}
                        for scope, timelines and pricing.
                      </p>
                    </div>
                  </aside>
                </div>

                {/* -------------------------------------------------- Sections */}
                {(service.sections?.length ?? 0) > 0 && (
                  <div className="space-y-5 py-10 sm:py-12">
                    {service.sections.map((section, index) => (
                      <section
                        key={section.heading || `section-${index}`}
                        aria-labelledby={`service-section-${index}`}
                        className={`${CARD} p-6 sm:p-8`}
                      >
                        <h2
                          id={`service-section-${index}`}
                          className="text-xl font-semibold tracking-tight text-white break-words sm:text-2xl"
                        >
                          {section.heading}
                        </h2>
                        {section.body ? (
                          <p className="mt-3 text-sm leading-relaxed text-[#b7c2d6] sm:text-[15px]">
                            {section.body}
                          </p>
                        ) : null}
                        {(section.items?.length ?? 0) > 0 && (
                          <ul
                            className={`mt-5 grid gap-2.5 ${
                              section.items.length > 3 ? 'sm:grid-cols-2' : 'grid-cols-1'
                            }`}
                          >
                            {section.items.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2.5 text-sm leading-relaxed text-[#b7c2d6]"
                              >
                                <CheckCircle2
                                  className="mt-0.5 h-4 w-4 shrink-0 text-[#3d8bff]"
                                  aria-hidden="true"
                                />
                                <span className="break-words">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                )}

                {/* --------------------------------------------- Key features */}
                {(service.features?.length ?? 0) > 0 && (
                  <section aria-labelledby="detail-features-title" className="pb-4">
                    <h2 id="detail-features-title" className="text-2xl font-bold tracking-tight text-white">
                      Key Features
                    </h2>
                    <ul className="mt-5 flex flex-wrap gap-2.5">
                      {service.features.map((feature) => (
                        <li
                          key={feature}
                          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(148,170,210,.2)] bg-white/[0.03] px-4 py-2.5 text-sm text-[#b7c2d6]"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3d8bff]" aria-hidden="true" />
                          <span className="break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ------------------------------------------------- Related */}
                {related.length > 0 ? (
                  <section aria-labelledby="related-title" className="pb-20 pt-10 sm:pb-28">
                    <div className="mb-6 flex items-center gap-4">
                      <h2 id="related-title" className="text-2xl font-bold tracking-tight text-white">
                        Related Services
                      </h2>
                      <span className="h-px flex-1 bg-[rgba(148,170,210,.12)]" aria-hidden="true" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
                      {related.map((item) => {
                        const RelatedIcon = getIcon(item.icon);
                        return (
                          <article key={item.slug} className={`${CARD} flex items-start gap-3.5 p-5`}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3d8bff]/10 text-[#3d8bff] ring-1 ring-[#3d8bff]/25">
                              <RelatedIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white break-words">{item.title}</h3>
                              <p className="mt-1 text-[13px] leading-relaxed text-[#8190a8]">
                                {item.tagline || item.shortDescription}
                              </p>
                              <a
                                {...navLink(`/services/${item.slug}`, onNavigate)}
                                className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3d8bff] transition hover:text-white"
                              >
                                Learn More
                                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <div className="h-16 sm:h-24" aria-hidden="true" />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
 * Local building blocks
 * ========================================================================= */

function DetailSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="pt-8">
        <div className="h-3 w-56 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-4 h-10 w-3/4 animate-pulse rounded-lg bg-white/[0.07]" />
          <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-6 h-3 w-full animate-pulse rounded bg-white/[0.05]" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-white/[0.05]" />
          <div className="mt-8 h-11 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-[rgba(148,170,210,.12)] bg-white/[0.03]" />
      </div>
      <div className="mt-10 space-y-5">
        <div className="h-40 animate-pulse rounded-2xl border border-[rgba(148,170,210,.12)] bg-white/[0.03]" />
        <div className="h-40 animate-pulse rounded-2xl border border-[rgba(148,170,210,.12)] bg-white/[0.03]" />
      </div>
    </div>
  );
}

function NotFoundState({ onNavigate }: { onNavigate?: NavigateFn }) {
  return (
    <div className="flex flex-col items-center py-24 text-center sm:py-32">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3d8bff]/10 text-[#3d8bff] ring-1 ring-[#3d8bff]/25">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        This service could not be found.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8190a8]">
        The service may have been renamed, moved or removed from the catalog.
      </p>
      <a {...navLink('/services', onNavigate)} className={`${BTN_PRIMARY} mt-8`}>
        Back to Business Solutions
      </a>
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


export function ServiceDetailPage(props: ServiceDetailPageProps) {
  return (
    <>
      <ServicesTopBar />
      <ServiceDetailPageBase {...props} />
      <ServicesFooter />
    </>
  )
}
export default ServiceDetailPage;
