// servicesContent.ts — shared static content, types, SEO utilities and data
// helpers for the PlayBeat Digital "Business Solutions" public section.
//
// This module is intentionally `.ts` (no JSX): the JSON-LD components below
// return `null` and inject <script type="application/ld+json"> tags into
// document.head via effects, removing them again on unmount.

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AppWindow,
  Archive,
  Briefcase,
  Building2,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Hotel,
  Landmark,
  Layers,
  LayoutDashboard,
  Palette,
  PenTool,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Workflow,
} from 'lucide-react';

/* =========================================================================
 * Types
 * ========================================================================= */

export type ServiceCategoryKey = 'development' | 'business' | 'creative' | 'advanced';

export type NavigateFn = (path: string) => void;

export interface ServiceLite {
  slug: string;
  title: string;
  category: ServiceCategoryKey;
  tagline: string;
  shortDescription: string;
  features: string[];
  icon: string;
  displayOrder: number;
  featured: boolean;
  ctaLabel: string;
}

export interface ServiceSection {
  heading: string;
  body: string;
  items: string[];
}

export interface ServiceFull extends ServiceLite {
  sections: ServiceSection[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface PortfolioItem {
  slug: string;
  title: string;
  industry: string;
  service: string;
  description: string;
  results: string;
  techSummary: string;
  clientName: string | null;
  featured: boolean;
}

export interface BreadcrumbItem {
  name: string;
  path?: string;
}

export interface Industry {
  slug: string;
  icon: string;
  name: string;
  items: string[];
}

export interface WhyUsPoint {
  icon: string;
  name: string;
  d: string;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface ProcessStep {
  n: string;
  name: string;
  d: string;
}

/* =========================================================================
 * Static content
 * ========================================================================= */

export const TRUST_STRIP: string[] = [
  'Web Development',
  'Business Applications',
  'CRM & Automation',
  'Digital Commerce',
  'Enterprise Systems',
  'Professional Design',
];

export const SERVICE_CATEGORIES: Array<{ key: ServiceCategoryKey; label: string }> = [
  { key: 'development', label: 'Development' },
  { key: 'business', label: 'Business Systems' },
  { key: 'creative', label: 'Creative' },
  { key: 'advanced', label: 'Advanced Solutions' },
];

export const INDUSTRIES: Industry[] = [
  {
    slug: 'retail',
    icon: 'ShoppingCart',
    name: 'Retail & Commerce',
    items: ['E-commerce', 'inventory', 'customer management', 'order systems'],
  },
  {
    slug: 'healthcare',
    icon: 'HeartPulse',
    name: 'Healthcare & Clinics',
    items: ['patient administration', 'appointments', 'internal records', 'staff systems'],
  },
  {
    slug: 'property',
    icon: 'Home',
    name: 'Property & Real Estate',
    items: ['property listings', 'lead management', 'CRM', 'property portals'],
  },
  {
    slug: 'hospitality',
    icon: 'Hotel',
    name: 'Hospitality',
    items: ['property information', 'booking requests', 'guest management', 'admin tools'],
  },
  {
    slug: 'restaurants',
    icon: 'UtensilsCrossed',
    name: 'Restaurants & Food Businesses',
    items: ['digital menus', 'ordering systems', 'customer databases', 'admin panels'],
  },
  {
    slug: 'education',
    icon: 'GraduationCap',
    name: 'Education',
    items: ['student portals', 'staff portals', 'course systems', 'administration'],
  },
  {
    slug: 'professional',
    icon: 'Briefcase',
    name: 'Professional Services',
    items: ['client portals', 'CRM', 'project tracking', 'document management'],
  },
  {
    slug: 'corporate',
    icon: 'Landmark',
    name: 'Corporate Operations',
    items: ['staff dashboards', 'internal workflows', 'reporting', 'secure administration'],
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  { n: '01', name: 'Discovery', d: 'Understand business goals, users, requirements and workflow.' },
  { n: '02', name: 'Planning', d: 'Define project scope, architecture, milestones and features.' },
  { n: '03', name: 'Design', d: 'Design user journeys, UI and responsive screens.' },
  { n: '04', name: 'Development', d: 'Build frontend, backend, database and integrations.' },
  { n: '05', name: 'Testing', d: 'Test workflows, responsive behavior, forms, APIs and access control.' },
  { n: '06', name: 'Launch', d: 'Deploy the approved production version.' },
  { n: '07', name: 'Support', d: 'Provide improvement, maintenance and expansion options.' },
];

export const WHY_US: WhyUsPoint[] = [
  {
    icon: 'Layers',
    name: 'Custom Architecture',
    d: 'Solutions are structured around project requirements rather than one generic template.',
  },
  {
    icon: 'Target',
    name: 'Business-Focused Design',
    d: 'Interfaces are built around actual user and operational workflows.',
  },
  {
    icon: 'Smartphone',
    name: 'Responsive Experience',
    d: 'Systems are optimized for desktop, tablet and mobile usage.',
  },
  {
    icon: 'ShieldCheck',
    name: 'Secure Access',
    d: 'User roles and protected areas can be implemented according to project requirements.',
  },
  {
    icon: 'Database',
    name: 'Centralized Management',
    d: 'Admin platforms can allow teams to manage data, users, content and processes from one place.',
  },
  {
    icon: 'TrendingUp',
    name: 'Scalable Structure',
    d: 'Build modular systems that can expand as business requirements change.',
  },
];

export const SERVICES_FAQ: FaqEntry[] = [
  {
    q: 'What types of businesses do you work with?',
    a: 'PlayBeat Digital can build digital solutions for startups, SMEs, established businesses and organizations across multiple industries.',
  },
  {
    q: 'Can you build a completely custom system?',
    a: 'Yes. Projects can be structured around specific workflows, users, roles and operational requirements.',
  },
  {
    q: 'Do you provide admin panels?',
    a: 'Yes. Administrative dashboards can be created for managing users, content, orders, services, reports and other project-specific workflows.',
  },
  {
    q: 'Can you redesign an existing website?',
    a: 'Yes. Existing websites can be redesigned or rebuilt while retaining important content and business requirements.',
  },
  {
    q: 'Can you create business PDFs and company profiles?',
    a: 'Yes. PlayBeat Digital provides professional company profiles, catalogs, proposals, reports and other branded business documents.',
  },
  {
    q: 'Can you create document archive systems?',
    a: 'Yes. Custom digital archive systems can be designed for organizing, searching and securely managing business documents.',
  },
  {
    q: 'How is project pricing calculated?',
    a: 'Pricing depends on project scope, features, complexity, design requirements, integrations and delivery requirements.',
  },
  {
    q: 'Can projects be expanded later?',
    a: 'Where the architecture permits, additional modules and capabilities can be added as business needs grow.',
  },
];

/* =========================================================================
 * Icons
 * ========================================================================= */

export const iconMap: Record<string, LucideIcon> = {
  AppWindow,
  Archive,
  Briefcase,
  Building2,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Hotel,
  Landmark,
  Layers,
  LayoutDashboard,
  Palette,
  PenTool,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Workflow,
};

/** Resolve a lucide icon name (from API data) to a component, with fallback. */
export function getIcon(name: string | null | undefined): LucideIcon {
  if (name && iconMap[name]) return iconMap[name];
  return Briefcase;
}

/** Human label for a service category key, e.g. 'development' → 'Development'. */
export function categoryLabel(key: string | null | undefined): string {
  const match = SERVICE_CATEGORIES.find((category) => category.key === key);
  return match ? match.label : 'Business Solution';
}

/* =========================================================================
 * Navigation
 * ========================================================================= */

/**
 * SPA navigation helper — pushes the path onto history, notifies the route
 * listener via a synthetic popstate event and scrolls back to the top.
 * Attach to plain <a href> via `navLink()` so middle-click / new-tab still work.
 */
export function go(path: string): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname + window.location.search !== path) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

/**
 * Returns `{ href, onClick }` for an internal link. Left click navigates
 * through the SPA (onNavigate if provided, otherwise `go`); modified clicks
 * (ctrl/cmd/shift/alt or middle click) fall through to the browser default.
 */
export function navLink(
  path: string,
  onNavigate?: NavigateFn,
): { href: string; onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void } {
  return {
    href: path,
    onClick: (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (onNavigate) onNavigate(path);
      else go(path);
    },
  };
}

/* =========================================================================
 * Data access
 * ========================================================================= */

// Mirrors the codebase convention used in ContactPage.tsx.
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

export interface ApiError extends Error {
  status: number | null;
}

function createApiError(message: string, status: number | null): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

/**
 * fetch + JSON parse with graceful handling of non-JSON responses and server
 * error payloads shaped like `{ success: false, error: string }`.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw createApiError('Network error. Please check your connection and try again.', null);
  }

  const raw = await response.text().catch(() => '');
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null; // non-JSON body — handled gracefully below
    }
  }

  if (!response.ok) {
    const serverMessage =
      payload !== null &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : null;
    throw createApiError(serverMessage ?? `Request failed with status ${response.status}.`, response.status);
  }

  return (payload ?? {}) as T;
}

export interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  retry: () => void;
}

/** Small data-fetching hook with loading / error / retry states. */
export function useApiResource<T>(url: string): ApiResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    fetchJson<T>(url)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const message =
          cause instanceof Error && cause.message
            ? cause.message
            : 'Something went wrong. Please try again.';
        const status =
          cause !== null &&
          typeof cause === 'object' &&
          'status' in cause &&
          typeof (cause as { status?: unknown }).status === 'number'
            ? (cause as { status: number }).status
            : null;
        setError(message);
        setErrorStatus(status);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { data, loading, error, errorStatus, retry };
}

/* =========================================================================
 * SEO (title / meta / canonical / Open Graph)
 * ========================================================================= */

export const SITE_URL = 'https://playbeat.digital';

export function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export interface SeoOptions {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
}

/** Set document title, description, canonical and OG tags (idempotent upsert). */
export function applySeo({ title, description, canonical, ogType = 'website' }: SeoOptions): void {
  if (typeof document === 'undefined') return;
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:site_name', 'PlayBeat Digital');
  if (canonical) {
    upsertCanonical(canonical);
    upsertMeta('property', 'og:url', canonical);
  }
}

/* =========================================================================
 * JSON-LD structured data (no ratings/reviews — factual schema only)
 * ========================================================================= */

function injectJsonLd(data: Record<string, unknown>): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const element = document.createElement('script');
  element.type = 'application/ld+json';
  element.text = JSON.stringify(data);
  document.head.appendChild(element);
  return () => {
    element.remove();
  };
}

/** Service schema for one service detail page. */
export function ServiceJsonLd({ service }: { service: ServiceFull }): null {
  useEffect(() => {
    return injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: service.title,
      description: service.seoDescription || service.shortDescription,
      serviceType: service.title,
      url: `${SITE_URL}/services/${service.slug}`,
      provider: { '@type': 'Organization', name: 'PlayBeat Digital', url: SITE_URL },
    });
  }, [service]);
  return null;
}

/** FAQPage schema for the services hub accordion. */
export function FaqJsonLd(): null {
  useEffect(() => {
    return injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: SERVICES_FAQ.map((entry) => ({
        '@type': 'Question',
        name: entry.q,
        acceptedAnswer: { '@type': 'Answer', text: entry.a },
      })),
    });
  }, []);
  return null;
}

/** BreadcrumbList schema — pass items like [{ name: 'Home', path: '/' }]. */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }): null {
  useEffect(() => {
    return injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
      })),
    });
  }, [items]);
  return null;
}

/* =========================================================================
 * Shared design-system classes (premium dark enterprise look)
 * ========================================================================= */

export const CONTAINER = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8';
export const SECTION = 'py-14 sm:py-20';
export const EYEBROW = 'text-[11px] font-mono uppercase tracking-[0.2em] text-[#3d8bff]';
export const H2 = 'text-3xl sm:text-4xl font-bold tracking-tight text-white';
export const CARD =
  'rounded-2xl border border-[rgba(148,170,210,.17)] bg-white/[0.03] backdrop-blur-sm transition hover:-translate-y-1 hover:border-[rgba(61,139,255,.45)] hover:shadow-[0_12px_40px_rgba(61,139,255,.14)]';
export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#3d8bff] px-6 py-3 text-sm font-semibold text-white transition hover:shadow-[0_8px_30px_rgba(61,139,255,.35)]';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(148,170,210,.32)] px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#3d8bff]/60 hover:text-white';
export const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border border-[rgba(148,170,210,.2)] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-[#b7c2d6]';
export const LABEL = 'mb-1.5 block text-sm font-medium text-slate-200';
export const INPUT =
  'w-full rounded-xl bg-white/[0.04] border border-[rgba(148,170,210,.25)] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#3d8bff]';
export const PAGE_BG: CSSProperties = {
  background:
    'radial-gradient(900px 480px at 82% -6%, rgba(61,139,255,.17), transparent 60%), radial-gradient(700px 420px at 2% 4%, rgba(37,99,235,.1), transparent 60%), linear-gradient(180deg, #050913, #0a1426 70%, #050913)',
};
