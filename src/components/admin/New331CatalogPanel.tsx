import React, { useMemo, useState } from 'react'
import {
  SERVICES_CATALOG,
  STOREFRONT_CATEGORIES,
  FEATURED_FLAGSHIP_SERVICES,
  formatPkr,
  formatUsd,
  type PackageLevel,
  type StorefrontCategory,
} from '../../data/new331ServicesCatalog'

type TierFilter = 'All' | PackageLevel

export const New331CatalogPanel: React.FC = () => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<StorefrontCategory>('All')
  const [tier, setTier] = useState<TierFilter>('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SERVICES_CATALOG.filter((item) => {
      const categoryMatch = category === 'All' || item.storefrontGroup === category
      const tierMatch = tier === 'All' || item.packageLevel === tier
      const textMatch = !q || [
        item.name, item.category, item.shortDescription, item.architectureStack,
        ...item.deliverables,
      ].join(' ').toLowerCase().includes(q)
      return categoryMatch && tierMatch && textMatch
    })
  }, [query, category, tier])

  const exportCsv = () => {
    const rows = [
      ['Name', 'Category', 'Group', 'Tier', 'PKR', 'USD', 'Delivery', 'Description'].map(csv).join(','),
      ...filtered.map((item) => [
        item.name, item.category, item.storefrontGroup, item.packageLevel,
        String(item.recommendedPkr), String(item.optionalUsd), item.deliveryTime,
        item.shortDescription,
      ].map(csv).join(',')),
    ]
    const blobUrl = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = 'new331-services-catalog.csv'
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  return (
    <section aria-label="Embedded new331 services catalog">
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-3">
        <div>
          <h2 className="h5 font-weight-bold text-white mb-1">new331 Services Catalog</h2>
          <p className="small text-muted mb-0">
            Embedded catalog records from the new331 source. Service editing and publication remain connected to izoko’s first-party CMS.
          </p>
        </div>
        <button type="button" className="btn btn-outline-primary btn-sm mt-2 mt-md-0" onClick={exportCsv}>
          Export filtered CSV
        </button>
      </div>

      <div className="row mb-3">
        <div className="col-12 col-md-5">
          <label className="sr-only" htmlFor="new331-catalog-search">Search catalog</label>
          <input
            id="new331-catalog-search"
            className="form-control form-control-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services, descriptions or deliverables"
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4">
          <label className="sr-only" htmlFor="new331-catalog-category">Category</label>
          <select id="new331-catalog-category" className="custom-select custom-select-sm" value={category} onChange={(event) => setCategory(event.target.value as StorefrontCategory)}>
            {STOREFRONT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <label className="sr-only" htmlFor="new331-catalog-tier">Package tier</label>
          <select id="new331-catalog-tier" className="custom-select custom-select-sm" value={tier} onChange={(event) => setTier(event.target.value as TierFilter)}>
            {(['All', 'Basic', 'Professional', 'Enterprise'] as TierFilter[]).map((item) => <option key={item} value={item}>{item} tier</option>)}
          </select>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12 col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body py-3"><div className="small text-muted">Catalog services</div><div className="h4 font-weight-bold text-dark mb-0">{filtered.length} <small className="text-muted">/ {SERVICES_CATALOG.length}</small></div></div></div></div>
        <div className="col-12 col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body py-3"><div className="small text-muted">Flagship blueprints</div><div className="h4 font-weight-bold text-dark mb-0">{FEATURED_FLAGSHIP_SERVICES.length}</div></div></div></div>
        <div className="col-12 col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body py-3"><div className="small text-muted">Source</div><div className="h6 font-weight-bold text-dark mb-0">new331 · embedded in izoko</div></div></div></div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-sm mb-0">
            <thead className="thead-light">
              <tr><th>Service</th><th>Category</th><th>Package</th><th>Delivery</th><th className="text-right">PKR</th><th className="text-right">USD</th></tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="font-weight-bold text-dark">
                    {item.name}
                    <div className="small text-muted font-weight-normal">{item.shortDescription}</div>
                  </td>
                  <td>{item.storefrontGroup}</td>
                  <td><span className="badge badge-light border">{item.packageLevel}</span></td>
                  <td className="text-nowrap">{item.deliveryTime}</td>
                  <td className="text-right text-nowrap">{formatPkr(item.recommendedPkr, item.isStartingFrom)}</td>
                  <td className="text-right text-nowrap">{formatUsd(item.optionalUsd, item.isStartingFrom)}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="text-center text-muted py-4">No catalog entries match those filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function csv(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`
}
