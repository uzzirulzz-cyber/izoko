// Shared product formatting helper
import { slugify } from "./config.js";

export function formatProduct(doc: any) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const id = _id ? _id.toString() : rest.id || `pb-${Date.now()}`;
  const name = rest.name || rest.title || "PlayBeat Product";
  const slug = rest.slug || slugify(name);
  const digital = rest.digital !== undefined ? Boolean(rest.digital) : rest.productType !== "physical";

  // ---- Subscription plans (ProductPlan sub-document) ----
  // Generalizes the ai-subscriptions duration model: a product may carry a
  // `plans` array (1/3/6/12 months …) with its own per-plan pricing. When the
  // doc has no explicit plans but uses Plan-labelled variants, the variants
  // are exposed through the same shape so the storefront can treat both
  // uniformly. Plan prices are ALWAYS recomputed server-side at order time.
  let plans: any[] | undefined;
  if (Array.isArray(rest.plans) && rest.plans.length) {
    plans = rest.plans
      .filter((p: any) => p && (p.label || p.months))
      .map((p: any, i: number) => ({
        id: String(p.id || `plan-${i + 1}`),
        label: String(p.label || `${p.months} Month${Number(p.months) > 1 ? "s" : ""}`),
        months: Number(p.months) || undefined,
        price: Number(p.price) || 0,
        originalPrice: p.originalPrice != null ? Number(p.originalPrice) : undefined,
        sku: p.sku ? String(p.sku) : undefined,
        badge: p.badge ? String(p.badge) : undefined,
      }));
  } else if (
    Array.isArray(rest.variants) &&
    rest.variants.length &&
    String(rest.variantLabel || "").toLowerCase() === "plan"
  ) {
    plans = rest.variants.map((v: any, i: number) => {
      const months = /12/.test(v.name) ? 12 : /6/.test(v.name) ? 6 : /3/.test(v.name) ? 3 : 1;
      return {
        id: String(v.id || `plan-${i + 1}`),
        label: String(v.name),
        months,
        price: Number(v.price) || 0,
        originalPrice: v.originalPrice != null ? Number(v.originalPrice) : undefined,
        sku: v.sku ? String(v.sku) : undefined,
        badge: v.badge ? String(v.badge) : undefined,
      };
    });
  }

  // ---- Inventory model ----
  // stockMode "unlimited" = never decrements, never blocks checkout (digital
  // products default to unlimited); "finite" tracks stock with an optional
  // lowStockThreshold used by the admin inventory panel.
  const stockMode = rest.stockMode === "finite" || rest.stockMode === "unlimited"
    ? rest.stockMode
    : rest.productType === "physical" || rest.digital === false
      ? "finite"
      : "unlimited";

  return {
    _id: id,
    id: rest.id || id,
    sku: rest.sku || `PB-${id.slice(-6).toUpperCase()}`,
    name,
    slug,
    category: rest.category || "Digital Products",
    productType: rest.productType || (digital ? "digital" : "physical"),
    description: rest.description || "",
    shortDescription:
      rest.shortDescription ||
      (rest.description ? rest.description.slice(0, 140) + (rest.description.length > 140 ? "..." : "") : ""),
    detailedDescription: rest.detailedDescription || rest.description || "",
    price: typeof rest.price === "number" ? rest.price : Number(rest.price) || 0,
    originalPrice: rest.originalPrice ? Number(rest.originalPrice) : rest.compareAtPrice ? Number(rest.compareAtPrice) : undefined,
    compareAtPrice: rest.compareAtPrice ? Number(rest.compareAtPrice) : rest.originalPrice ? Number(rest.originalPrice) : undefined,
    currency: rest.currency || "PKR",
    discountPercent: rest.discountPercent || 0,
    image: rest.image || rest.imageUrl || "/playbeat-logo.png",
    gallery: Array.isArray(rest.gallery) ? rest.gallery : Array.isArray(rest.galleryImages) ? rest.galleryImages : [rest.image || "/playbeat-logo.png"],
    galleryImages: Array.isArray(rest.galleryImages) ? rest.galleryImages : Array.isArray(rest.gallery) ? rest.gallery : [],
    additionalImages: Array.isArray(rest.additionalImages) ? rest.additionalImages : [],
    tags: Array.isArray(rest.tags) ? rest.tags : ["Verified", "Digital"],
    digital,
    stock: typeof rest.stock === "number" ? rest.stock : Number(rest.stock) || 50,
    stockMode,
    lowStockThreshold: typeof rest.lowStockThreshold === "number" ? rest.lowStockThreshold : 5,
    downloadUrl: rest.downloadUrl ? String(rest.downloadUrl) : undefined,
    activationNotes: rest.activationNotes ? String(rest.activationNotes) : undefined,
    ...(plans ? { plans } : {}),
    status: rest.status || (rest.stock === 0 ? "out_of_stock" : "in_stock"),
    rating: typeof rest.rating === "number" ? rest.rating : 4.8,
    reviewCount: typeof rest.reviewCount === "number" ? rest.reviewCount : 120,
    isHot: Boolean(rest.isHot),
    isFeatured: rest.isFeatured !== undefined ? Boolean(rest.isFeatured) : Boolean(rest.featured),
    featured: rest.featured !== undefined ? Boolean(rest.featured) : Boolean(rest.isFeatured),
    active: rest.active !== undefined ? Boolean(rest.active) : true,
    variants: Array.isArray(rest.variants) ? rest.variants : [],
    variantLabel: rest.variantLabel || undefined,
    consolidatedParentId: rest.consolidatedParentId || undefined,
    projectorSpec: rest.projectorSpec,
    deliveryType: rest.deliveryType || (digital ? "Instant Auto-Email" : "Courier Shipping (1-3 Days)"),
    deliveryInfo: rest.deliveryInfo || (digital ? "Instant 15-Second Key Delivery" : "Express Dispatched with Tracking"),
    region: rest.region || "Global",
    features: Array.isArray(rest.features) ? rest.features : [],
    createdAt: rest.createdAt || new Date(),
    updatedAt: rest.updatedAt || new Date(),
  };
}
