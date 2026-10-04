// ServiceRequestPage.tsx — "Request a Business Solution" project request form
// for the PlayBeat Digital Business Solutions section. Client-side validation,
// preselection of the service via ?service= query param, and a structured
// success state with the server-issued request id (SRV-YYYY-NNNNNN).

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  API_BASE,
  applySeo,
  BreadcrumbJsonLd,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CONTAINER,
  EYEBROW,
  fetchJson,
  INPUT,
  LABEL,
  navLink,
  PAGE_BG,
} from './servicesContent';
import type { BreadcrumbItem } from './servicesContent';
import { ServicesTopBar, ServicesFooter } from './ServicesTopBar'

type NavigateFn = (path: string) => void;

export interface ServiceRequestPageProps {
  /** Optional SPA navigation override (defaults to the go() helper). */
  onNavigate?: NavigateFn;
}

/* =========================================================================
 * Form options
 * ========================================================================= */

const SERVICE_OPTIONS = [
  'Website Development',
  'Web Application',
  'CRM System',
  'E-Commerce',
  'Admin Panel',
  'Automation',
  'AI-Assisted Solution',
  'UI/UX',
  'Graphic Design',
  'Business Document Design',
  'Digital Archive',
  'Business Application',
  'Custom Software',
  'Other',
];

const PROJECT_TYPE_OPTIONS = ['New Project', 'Redesign', 'Upgrade', 'Integration', 'Other'];

const BUDGET_OPTIONS = [
  'Not sure yet',
  'Under $500',
  '$500 – $1,500',
  '$1,500 – $5,000',
  '$5,000 – $15,000',
  '$15,000+',
];

const TIMELINE_OPTIONS = ['ASAP', '2-4 weeks', '1-3 months', '3-6 months', 'Flexible'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BREADCRUMB: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Business Solutions', path: '/services' },
  { name: 'Request a Project', path: '/services/request' },
];

/* =========================================================================
 * Form model
 * ========================================================================= */

interface RequestForm {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  industry: string;
  service: string;
  projectType: string;
  currentWebsite: string;
  description: string;
  features: string;
  budget: string;
  timeline: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof RequestForm, string>>;

const EMPTY_FORM: RequestForm = {
  fullName: '',
  businessName: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  industry: '',
  service: '',
  projectType: '',
  currentWebsite: '',
  description: '',
  features: '',
  budget: '',
  timeline: '',
  notes: '',
};

function readPreselectedService(): string {
  if (typeof window === 'undefined') return '';
  const value = new URLSearchParams(window.location.search).get('service');
  if (!value) return '';
  const trimmed = value.trim();
  const match = SERVICE_OPTIONS.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  return match || trimmed;
}

function createInitialForm(): RequestForm {
  return { ...EMPTY_FORM, service: readPreselectedService() };
}

function validateRequestForm(form: RequestForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'Please enter your full name.';
  if (!form.email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!form.phone.trim()) errors.phone = 'Please enter a phone or WhatsApp number.';
  if (!form.service) errors.service = 'Please select the service you need.';
  if (!form.description.trim()) errors.description = 'Please describe your project.';
  return errors;
}

/* =========================================================================
 * Page
 * ========================================================================= */

function ServiceRequestPageBase({ onNavigate }: ServiceRequestPageProps) {
  const [form, setForm] = useState<RequestForm>(createInitialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    applySeo({
      title: 'Request a Business Solution | PlayBeat Digital',
      description:
        'Request a custom website, business application, CRM system, e-commerce platform, automation or digital archive solution from PlayBeat Digital. Tell us about your project and get a structured plan.',
      canonical: 'https://playbeat.digital/services/request',
    });
  }, []);

  const serviceOptions = useMemo(() => {
    if (!form.service || SERVICE_OPTIONS.includes(form.service)) return SERVICE_OPTIONS;
    return [form.service, ...SERVICE_OPTIONS];
  }, [form.service]);

  function bind(key: keyof RequestForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((prev) => {
        const next: RequestForm = { ...prev };
        next[key] = value;
        return next;
      });
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next: FormErrors = { ...prev };
        delete next[key];
        return next;
      });
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRequestForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await fetchJson<{ success?: boolean; requestId?: string; error?: string }>(
        `${API_BASE}/api/services/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form }),
        },
      );
      if (!result || typeof result.requestId !== 'string' || !result.requestId) {
        throw new Error(result?.error || 'The request could not be submitted. Please try again.');
      }
      setRequestId(result.requestId);
      window.scrollTo({ top: 0 });
    } catch (cause) {
      setSubmitError(
        cause instanceof Error && cause.message
          ? cause.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

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
                <p className={EYEBROW}>Project Request</p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Request a Business Solution
                </h1>
                <p className="mt-5 text-base leading-relaxed text-[#b7c2d6] sm:text-lg">
                  Tell us about your project and the PlayBeat Digital team will respond with a
                  structured plan.
                </p>
              </div>
            </div>
          </header>

          {/* ---------------------------------------------------------- Form */}
          <section className="pb-20 pt-10 sm:pb-28 sm:pt-14">
            <div className={CONTAINER}>
              <div className="mx-auto max-w-3xl">
                {requestId ? (
                  <SuccessCard requestId={requestId} onNavigate={onNavigate} />
                ) : (
                  <form
                    noValidate
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-[rgba(148,170,210,.17)] bg-white/[0.03] p-5 backdrop-blur-sm sm:p-8"
                  >
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                      <Field label="Full Name" htmlFor="fullName" required error={errors.fullName}>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          placeholder="e.g. Ahmed Raza"
                          value={form.fullName}
                          onChange={bind('fullName')}
                          aria-invalid={Boolean(errors.fullName)}
                          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                          className={controlClass(errors.fullName)}
                        />
                      </Field>

                      <Field label="Business Name" htmlFor="businessName">
                        <input
                          id="businessName"
                          name="businessName"
                          type="text"
                          autoComplete="organization"
                          placeholder="e.g. Raza Trading Co."
                          value={form.businessName}
                          onChange={bind('businessName')}
                          className={controlClass()}
                        />
                      </Field>

                      <Field label="Email Address" htmlFor="email" required error={errors.email}>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@company.com"
                          value={form.email}
                          onChange={bind('email')}
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          className={controlClass(errors.email)}
                        />
                      </Field>

                      <Field label="Phone / WhatsApp" htmlFor="phone" required error={errors.phone}>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+92 3XX XXXXXXX"
                          value={form.phone}
                          onChange={bind('phone')}
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? 'phone-error' : undefined}
                          className={controlClass(errors.phone)}
                        />
                      </Field>

                      <Field label="Country" htmlFor="country">
                        <input
                          id="country"
                          name="country"
                          type="text"
                          autoComplete="country-name"
                          placeholder="e.g. Pakistan"
                          value={form.country}
                          onChange={bind('country')}
                          className={controlClass()}
                        />
                      </Field>

                      <Field label="City" htmlFor="city">
                        <input
                          id="city"
                          name="city"
                          type="text"
                          autoComplete="address-level2"
                          placeholder="e.g. Abbottabad"
                          value={form.city}
                          onChange={bind('city')}
                          className={controlClass()}
                        />
                      </Field>

                      <Field label="Industry" htmlFor="industry">
                        <input
                          id="industry"
                          name="industry"
                          type="text"
                          placeholder="e.g. Retail & Commerce"
                          value={form.industry}
                          onChange={bind('industry')}
                          className={controlClass()}
                        />
                      </Field>

                      <Field label="Service" htmlFor="service" required error={errors.service}>
                        <select
                          id="service"
                          name="service"
                          value={form.service}
                          onChange={bind('service')}
                          aria-invalid={Boolean(errors.service)}
                          aria-describedby={errors.service ? 'service-error' : undefined}
                          className={selectClass(errors.service)}
                        >
                          <option value="">Select a service…</option>
                          {serviceOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Project Type" htmlFor="projectType">
                        <select
                          id="projectType"
                          name="projectType"
                          value={form.projectType}
                          onChange={bind('projectType')}
                          className={selectClass()}
                        >
                          <option value="">Select a project type…</option>
                          {PROJECT_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Current Website" htmlFor="currentWebsite">
                        <input
                          id="currentWebsite"
                          name="currentWebsite"
                          type="url"
                          autoComplete="url"
                          placeholder="https://your-company.com"
                          value={form.currentWebsite}
                          onChange={bind('currentWebsite')}
                          className={controlClass()}
                        />
                      </Field>

                      <Field
                        label="Project Description"
                        htmlFor="description"
                        required
                        error={errors.description}
                        className="sm:col-span-2"
                      >
                        <textarea
                          id="description"
                          name="description"
                          rows={5}
                          placeholder="What are you building, and what problem should it solve for your business?"
                          value={form.description}
                          onChange={bind('description')}
                          aria-invalid={Boolean(errors.description)}
                          aria-describedby={errors.description ? 'description-error' : undefined}
                          className={`${controlClass(errors.description)} resize-y`}
                        />
                      </Field>

                      <Field label="Required Features" htmlFor="features" className="sm:col-span-2">
                        <textarea
                          id="features"
                          name="features"
                          rows={4}
                          placeholder="List the features or modules you need (one per line)…"
                          value={form.features}
                          onChange={bind('features')}
                          className={`${controlClass()} resize-y`}
                        />
                      </Field>

                      <Field label="Estimated Budget" htmlFor="budget">
                        <select
                          id="budget"
                          name="budget"
                          value={form.budget}
                          onChange={bind('budget')}
                          className={selectClass()}
                        >
                          <option value="">Select a budget range…</option>
                          {BUDGET_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Expected Timeline" htmlFor="timeline">
                        <select
                          id="timeline"
                          name="timeline"
                          value={form.timeline}
                          onChange={bind('timeline')}
                          className={selectClass()}
                        >
                          <option value="">Select a timeline…</option>
                          {TIMELINE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Additional Notes" htmlFor="notes" className="sm:col-span-2">
                        <textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          placeholder="Anything else the team should know?"
                          value={form.notes}
                          onChange={bind('notes')}
                          className={`${controlClass()} resize-y`}
                        />
                      </Field>
                    </div>

                    <div className="mt-8 space-y-4">
                      {submitError && (
                        <div
                          role="alert"
                          className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
                          <p className="text-sm leading-relaxed text-red-200 break-words">{submitError}</p>
                        </div>
                      )}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                          type="submit"
                          disabled={submitting}
                          className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              Submitting…
                            </>
                          ) : (
                            <>
                              Submit Project Request
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </>
                          )}
                        </button>
                        <p className="text-[12px] text-[#8190a8]">
                          Fields marked <span className="text-[#3d8bff]">*</span> are required.
                        </p>
                      </div>
                    </div>
                  </form>
                )}
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

function controlClass(error?: string) {
  return error ? `${INPUT} border-red-400/60 focus:border-red-400` : INPUT;
}

function selectClass(error?: string) {
  // Native <select> — keep the OS arrow, but render the dropdown dark.
  return `${controlClass(error)} [&>option]:bg-[#0a1426] [&>option]:text-slate-100`;
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={LABEL}>
        {label}
        {required ? (
          <>
            <span className="ml-1 text-[#3d8bff]" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[13px] text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SuccessCard({ requestId, onNavigate }: { requestId: string; onNavigate?: NavigateFn }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[#3d8bff]/30 bg-white/[0.03] px-6 py-14 text-center backdrop-blur-sm">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3d8bff]/10 ring-1 ring-[#3d8bff]/40">
        <CheckCircle2 className="h-8 w-8 text-[#3d8bff]" aria-hidden="true" />
      </span>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Project Request Received
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b7c2d6] sm:text-base">
        Thank you for contacting PlayBeat Digital. Your project request has been recorded
        successfully.
      </p>
      <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-[#8190a8]">Request ID</p>
      <p className="mt-2 rounded-lg border border-[#3d8bff]/30 bg-[#3d8bff]/10 px-4 py-2 font-mono text-sm text-[#3d8bff]">
        {requestId}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a {...navLink('/services', onNavigate)} className={BTN_PRIMARY}>
          View Services
        </a>
        <a {...navLink('/', onNavigate)} className={BTN_SECONDARY}>
          Return Home
        </a>
      </div>
    </div>
  );
}


export function ServiceRequestPage() {
  return (
    <>
      <ServicesTopBar />
      <ServiceRequestPageBase  />
      <ServicesFooter />
    </>
  )
}
export default ServiceRequestPage;
