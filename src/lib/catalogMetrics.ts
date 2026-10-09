export function hasUnlimitedStock(product: any): boolean {
  return product.stockMode === 'unlimited' || (product.stockMode !== 'finite' && product.digital !== false && product.productType !== 'physical')
}
export function catalogDiscount(product: { price: number; originalPrice?: number }): number {
  const original = Number(product.originalPrice)
  return original > 0 && original > product.price ? Math.round((original - product.price) / original * 100) : 0
}
