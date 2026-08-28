export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

export function ensureProductSlug(product: any): string {
  if (product.slug && typeof product.slug === 'string' && product.slug.trim().length > 0) {
    return slugify(product.slug)
  }
  const base = product.name || product.title || product.sku || 'product'
  return slugify(base)
}
