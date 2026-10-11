import React, { useState } from 'react'
import { Activity, Boxes, Briefcase, ClipboardList, Radio, ShoppingBag, Sparkles, Star, Tags } from 'lucide-react'
import { PlaybeatLivePanel } from './PlaybeatLivePanel'
import { ServicesPanel } from './ServicesPanel'
import { ServiceRequestsPanel } from './ServiceRequestsPanel'
import { InventoryPanel, CouponCodesPanel, ReviewsModerationPanel, HomepageBuilderPanel } from './OpsPanels'
import { CRMApp } from '../crm/CRMApp'
import { New331CatalogPanel } from './New331CatalogPanel'

type WorkspaceTab =
  | 'overview'
  | 'crm'
  | 'live'
  | 'services'
  | 'new331'
  | 'requests'
  | 'inventory'
  | 'promotions'
  | 'reviews'
  | 'homepage'

interface AllInOneWorkspaceProps {
  onToast?: (message: string, kind?: 'ok' | 'err') => void
  onNavigate: (section: string) => void
  onChanged?: () => void
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Activity size={15} /> },
  { id: 'crm', label: 'Lead Pulse CRM', icon: <Briefcase size={15} /> },
  { id: 'live', label: 'PlayBeat.live', icon: <Radio size={15} /> },
  { id: 'services', label: 'Digital Services CMS', icon: <Sparkles size={15} /> },
  { id: 'new331', label: 'new331 Catalog', icon: <ShoppingBag size={15} /> },
  { id: 'requests', label: 'Requests', icon: <ClipboardList size={15} /> },
  { id: 'inventory', label: 'Inventory', icon: <Boxes size={15} /> },
  { id: 'promotions', label: 'Promotions', icon: <Tags size={15} /> },
  { id: 'reviews', label: 'Reviews', icon: <Star size={15} /> },
  { id: 'homepage', label: 'Homepage', icon: <ShoppingBag size={15} /> },
]

/**
 * First-party workspace for the PlayBeat apps, mounted directly in izoko's
 * authenticated admin. Each tab renders the local admin module and uses the
 * izoko API/session; there are no remote app frames or Vercel app proxies here.
 */
export const AllInOneWorkspace: React.FC<AllInOneWorkspaceProps> = ({
  onToast,
  onNavigate,
  onChanged,
}) => {
  const [tab, setTab] = useState<WorkspaceTab>('overview')

  const renderTab = () => {
    switch (tab) {
      case 'crm':
        return <CRMApp embedded onExit={() => setTab('overview')} />
      case 'live':
        return <PlaybeatLivePanel onNavigate={onNavigate} />
      case 'services':
        return <ServicesPanel onToast={onToast} />
      case 'new331':
        return <New331CatalogPanel />
      case 'requests':
        return <ServiceRequestsPanel onToast={onToast} onChanged={onChanged} />
      case 'inventory':
        return <InventoryPanel onToast={onToast} />
      case 'promotions':
        return <CouponCodesPanel onToast={onToast} />
      case 'reviews':
        return <ReviewsModerationPanel onToast={onToast} />
      case 'homepage':
        return <HomepageBuilderPanel onToast={onToast} />
      default:
        return (
          <div className="row g-3">
            <div className="col-12 col-xl-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-bottom py-3">
                  <h2 className="h6 mb-0 font-weight-bold text-dark">PlayBeat.live operations</h2>
                </div>
                <div className="card-body">
                  <PlaybeatLivePanel compact onNavigate={onNavigate} />
                  <div className="small text-muted mt-3">
                    Live status keeps its own source, timestamps and reporting; Digital store totals are never substituted.
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-bottom py-3">
                  <h2 className="h6 mb-0 font-weight-bold text-dark">Lead Pulse CRM</h2>
                </div>
                <div className="card-body">
                  <p className="small text-muted">Open the local CRM module inside this authenticated admin session.</p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('crm')}>
                    Open CRM workspace
                  </button>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <button type="button" className="card border-0 shadow-sm h-100 w-100 text-left" onClick={() => setTab('services')}>
                <div className="card-body">
                  <span className="badge badge-primary mb-2">Digital catalog</span>
                  <h2 className="h6 font-weight-bold text-dark">Services & portfolio CMS</h2>
                  <p className="small text-muted mb-0">Edit first-party services, portfolio entries and their publication status in izoko.</p>
                </div>
              </button>
            </div>
            <div className="col-12 col-md-6">
              <button type="button" className="card border-0 shadow-sm h-100 w-100 text-left" onClick={() => setTab('new331')}>
                <div className="card-body">
                  <span className="badge badge-primary mb-2">new331 source</span>
                  <h2 className="h6 font-weight-bold text-dark">Embedded services catalog</h2>
                  <p className="small text-muted mb-0">Browse, filter and export the source catalog in this admin. Edit and publish through the local CMS tab.</p>
                </div>
              </button>
            </div>
            <div className="col-12 col-md-6">
              <button type="button" className="card border-0 shadow-sm h-100 w-100 text-left" onClick={() => setTab('requests')}>
                <div className="card-body">
                  <span className="badge badge-info mb-2">Lead intake</span>
                  <h2 className="h6 font-weight-bold text-dark">Requests & proposals</h2>
                  <p className="small text-muted mb-0">Review and update incoming service requests in the same admin workspace.</p>
                </div>
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <section className="container-fluid px-0" aria-label="All-in-one PlayBeat administration">
      <header className="d-flex flex-wrap align-items-start justify-content-between mb-3">
        <div>
          <h1 className="h4 font-weight-bold text-white mb-1">All-in-One PlayBeat Workspace</h1>
          <p className="text-muted small mb-0">
            CRM, PlayBeat.live and Digital service operations, in one authenticated izoko admin.
          </p>
        </div>
        <span className="badge badge-success mt-1">First-party modules</span>
      </header>

      <div className="alert alert-light border small py-2 mb-3" role="status">
        <strong>One admin session.</strong> These tabs mount local izoko source modules and use its permission-checked APIs.
        No separate app window is required.
      </div>

      <nav className="nav nav-tabs flex-nowrap overflow-auto mb-3" aria-label="Integrated PlayBeat modules">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link d-inline-flex align-items-center text-nowrap ${tab === item.id ? 'active font-weight-bold' : ''}`}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            <span className="mr-2 d-inline-flex">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="pb-2">{renderTab()}</div>
    </section>
  )
}
