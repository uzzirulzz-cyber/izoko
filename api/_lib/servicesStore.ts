// Services / Business Solutions — shared store + validation helpers.
//
// Collections (MongoDB is the source of truth — brief rule 44):
//   services          → CMS-managed service definitions (slug, content, SEO…)
//   service_requests  → public project requests (SRV-YYYY-NNNNNN ids)
//   service_portfolio → case studies (client names hidden by default)
//
// Security: server-side validation on every write; internal notes NEVER leave
// admin routes; public projections strip quotes/notes/staff fields.
import { ObjectId } from "mongodb";

export type ServiceDoc = {
  slug: string;
  title: string;
  category: "development" | "business" | "creative" | "advanced";
  tagline: string;
  shortDescription: string;
  sections: { heading: string; body: string; items: string[] }[];
  features: string[];
  ctaLabel: string;
  seoTitle: string;
  seoDescription: string;
  icon: string; // lucide icon name, e.g. "Globe"
  displayOrder: number;
  featured: boolean;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PortfolioDoc = {
  slug: string;
  title: string;
  industry: string;
  service: string;
  description: string;
  problem: string;
  solution: string;
  features: string[];
  coverImage: string; // data URL or media URL
  screenshots: string[];
  results: string;
  techSummary: string;
  clientName: string;
  showClientName: boolean; // FALSE by default — never expose clients silently
  featured: boolean;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export const SERVICE_STATUSES = [
  "new", "contacted", "requirements_review", "proposal_draft", "proposal_sent",
  "negotiation", "approved", "in_progress", "waiting_customer", "completed",
  "cancelled", "archived",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  requirements_review: "Requirements Review",
  proposal_draft: "Proposal Draft",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  approved: "Approved",
  in_progress: "In Progress",
  waiting_customer: "Waiting for Customer",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const SERVICE_OPTIONS = [
  "Website Development", "Web Application", "CRM System", "E-Commerce",
  "Admin Panel", "Automation", "AI-Assisted Solution", "UI/UX",
  "Graphic Design", "Business Document Design", "Digital Archive",
  "Business Application", "Custom Software", "Other",
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: any, max: number): string =>
  String(v ?? "").trim().slice(0, max);

/** SRV-2026-000001 style human-readable request id (yearly counter). */
export async function nextServiceRequestId(db: any): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const counters = db.collection("service_request_counters");
    const doc = await counters.findOneAndUpdate(
      { key: String(year) },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" as any }
    );
    const seq = Number(doc?.seq || doc?.value?.seq || 1);
    return `SRV-${year}-${String(seq).padStart(6, "0")}`;
  } catch {
    return `SRV-${year}-${String(Date.now()).slice(-6)}`;
  }
}

/** Validate a public project-request submission. Throws on invalid input. */
export function validateServiceRequest(body: any) {
  const errors: string[] = [];
  const out: Record<string, any> = {};

  out.fullName = str(body.fullName, 120);
  if (out.fullName.length < 2) errors.push("Full name is required.");
  out.email = str(body.email, 160).toLowerCase();
  if (!EMAIL_RE.test(out.email)) errors.push("A valid email address is required.");
  out.phone = str(body.phone, 40);
  if (out.phone.replace(/[^\d]/g, "").length < 7) errors.push("A valid phone / WhatsApp number is required.");
  out.businessName = str(body.businessName, 160);
  out.country = str(body.country, 80);
  out.city = str(body.city, 80);
  out.industry = str(body.industry, 80);
  out.service = str(body.service, 80);
  if (!SERVICE_OPTIONS.includes(out.service)) errors.push("Please choose the required service.");
  out.projectType = str(body.projectType, 80);
  out.currentWebsite = str(body.currentWebsite, 240);
  out.description = str(body.description, 4000);
  if (out.description.length < 20) errors.push("Please describe the project (at least 20 characters).");
  out.features = str(body.features, 1000);
  out.budget = str(body.budget, 60);
  out.timeline = str(body.timeline, 60);
  out.notes = str(body.notes, 2000);

  // Attachments — max 3 files × 1 MB, whitelisted types, magic-byte sniffed.
  const atts = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) : [];
  const okMime = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  out.attachments = [];
  for (const a of atts) {
    const name = str(a?.name, 160) || "attachment";
    const mime = str(a?.type, 80);
    const data = String(a?.data || "");
    const b64 = data.includes(",") ? data.split(",")[1] : data;
    const bytes = Math.floor((b64.length * 3) / 4);
    if (!b64) continue;
    if (bytes > 1024 * 1024) { errors.push(`"${name}" is larger than 1 MB.`); continue; }
    if (!okMime.includes(mime)) { errors.push(`"${name}" — file type not allowed (pdf, images, doc, txt).`); continue; }
    out.attachments.push({ name, type: mime, size: bytes, data: `data:${mime};base64,${b64.slice(0, 1.4 * 1024 * 1024)}` });
  }
  const total = out.attachments.reduce((s: number, a: any) => s + a.size, 0);
  if (total > 2.8 * 1024 * 1024) errors.push("Attachments exceed the 2.5 MB total limit.");

  if (errors.length) throw new Error(errors.join(" "));
  return out;
}

/** Public projection of a request — the customer may only see safe fields. */
export function publicRequestView(doc: any) {
  if (!doc) return null;
  return {
    requestId: doc.requestId,
    service: doc.service,
    projectType: doc.projectType,
    status: doc.status,
    statusLabel: STATUS_LABELS[doc.status] || doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    estimatedQuote: doc.estimatedQuote || null,
    finalQuote: doc.finalQuote || null,
    proposalFiles: (doc.proposalFiles || []).map((p: any) => ({ name: p.name, url: p.url || null })),
  };
}

/** Admin-side sanitizer for service / portfolio CMS writes. */
export function sanitizeServiceDoc(raw: any, existing?: Partial<ServiceDoc> | null): Partial<ServiceDoc> {
  const out: any = {};
  out.slug = str(raw.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!/^[a-z0-9-]{2,80}$/.test(out.slug)) throw new Error("Invalid slug.");
  out.title = str(raw.title, 160);
  if (!out.title) throw new Error("Service title is required.");
  const cat = str(raw.category, 20).toLowerCase();
  if (!["development", "business", "creative", "advanced"].includes(cat)) throw new Error("Invalid category.");
  out.category = cat;
  out.tagline = str(raw.tagline, 200);
  out.shortDescription = str(raw.shortDescription, 600);
  out.sections = Array.isArray(raw.sections)
    ? raw.sections.slice(0, 12).map((s: any) => ({
        heading: str(s?.heading, 160),
        body: str(s?.body, 2000),
        items: Array.isArray(s?.items) ? s.items.slice(0, 20).map((i: any) => str(i, 200)) : [],
      }))
    : [];
  out.features = Array.isArray(raw.features) ? raw.features.slice(0, 30).map((f: any) => str(f, 200)) : [];
  out.ctaLabel = str(raw.ctaLabel, 80) || "Request This Service";
  out.seoTitle = str(raw.seoTitle, 200);
  out.seoDescription = str(raw.seoDescription, 400);
  out.icon = str(raw.icon, 60) || "Briefcase";
  out.displayOrder = Math.max(0, Math.min(999, Number(raw.displayOrder) || 0));
  out.featured = Boolean(raw.featured);
  out.published = raw.published === undefined ? existing?.published !== false : Boolean(raw.published);
  return out;
}

export function sanitizePortfolioDoc(raw: any, existing?: Partial<PortfolioDoc> | null): Partial<PortfolioDoc> {
  const out: any = {};
  out.slug = str(raw.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!/^[a-z0-9-]{2,80}$/.test(out.slug)) throw new Error("Invalid slug.");
  out.title = str(raw.title, 160);
  if (!out.title) throw new Error("Portfolio title is required.");
  out.industry = str(raw.industry, 80);
  out.service = str(raw.service, 80);
  out.description = str(raw.description, 2000);
  out.problem = str(raw.problem, 2000);
  out.solution = str(raw.solution, 2000);
  out.features = Array.isArray(raw.features) ? raw.features.slice(0, 24).map((f: any) => str(f, 200)) : [];
  out.coverImage = str(raw.coverImage, 2_000_000);
  out.screenshots = Array.isArray(raw.screenshots)
    ? raw.screenshots.slice(0, 8).map((s: any) => str(s, 2_000_000)).filter(Boolean)
    : [];
  out.results = str(raw.results, 2000);
  out.techSummary = str(raw.techSummary, 600);
  out.clientName = str(raw.clientName, 160);
  out.showClientName = Boolean(raw.showClientName); // false by default (brief §27)
  out.featured = Boolean(raw.featured);
  out.published = raw.published === undefined ? existing?.published !== false : Boolean(raw.published);
  return out;
}

export const oid = (id: string) => {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) throw new Error("Invalid id.");
  return new ObjectId(id);
};
