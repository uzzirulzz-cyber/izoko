// Shared product formatting helper
import { slugify } from "./config.js";

export function formatProduct(doc: any) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const id = _id ? _id.toString() : rest.id || `pb-${Date.now()}`;
  const name = rest.name || rest.title || "PlayBeat Product";
  const slug = rest.slug || slugify(name);
  const digital = rest.digital !== undefined ? Boolean(rest.digital) : rest.productType !== "physical";

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
    status: rest.status || (rest.stock === 0 ? "out_of_stock" : "in_stock"),
    rating: typeof rest.rating === "number" ? rest.rating : 4.8,
    reviewCount: typeof rest.reviewCount === "number" ? rest.reviewCount : 120,
    isHot: Boolean(rest.isHot),
    isFeatured: rest.isFeatured !== undefined ? Boolean(rest.isFeatured) : Boolean(rest.featured),
    featured: rest.featured !== undefined ? Boolean(rest.featured) : Boolean(rest.isFeatured),
    active: rest.active !== undefined ? Boolean(rest.active) : true,
    variants: Array.isArray(rest.variants) ? rest.variants : [],
    projectorSpec: rest.projectorSpec,
    deliveryType: rest.deliveryType || (digital ? "Instant Auto-Email" : "Courier Shipping (1-3 Days)"),
    deliveryInfo: rest.deliveryInfo || (digital ? "Instant 15-Second Key Delivery" : "Express Dispatched with Tracking"),
    region: rest.region || "Global",
    features: Array.isArray(rest.features) ? rest.features : [],
    createdAt: rest.createdAt || new Date(),
    updatedAt: rest.updatedAt || new Date(),
  };
}
