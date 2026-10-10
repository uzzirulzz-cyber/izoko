import React, { useEffect, useState } from 'react'
import { EnterpriseCrmDashboard } from './legacy/EnterpriseCrmDashboard'
import type { Lead, Seat } from './legacy/types/index'

const api = async (path: string) => {
  const token = localStorage.getItem('playbeat_admin_token')
  const response = await fetch(path, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const text = await response.text()
  let data: any = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

function toLead(user: any, orders: any[] = []): Lead {
  const id = String(user._id || user.id || user.email || user.customerEmail || 'customer')
  const name = String(user.name || user.companyName || user.email || user.customerName || 'Storefront customer')
  return {
    id,
    campaignId: 'playbeat-storefront',
    companyName: String(user.companyName || user.businessName || name),
    domain: '',
    normalizedDomain: '',
    websiteUrl: String(user.website || ''),
    email: String(user.email || user.customerEmail || ''),
    phone: String(user.phone || user.customerPhone || ''),
    address: String(user.address || ''),
    city: String(user.city || ''),
    country: String(user.country || ''),
    industry: String(user.industry || ''),
    sourceCategory: orders.length ? 'PlayBeat customer' : 'PlayBeat account',
    leadScore: 0,
    fingerprint: id,
    discoverySource: 'PlayBeat Digital customer records',
    assignedSeatId: user.seatId,
    assignedEmployeeName: user.name || '',
    crawledPagesCount: 0,
    isSynthetic: false,
    contactPerson: { name: String(user.name || ''), title: String(user.title || '') },
    status: orders.length ? 'CONVERTED' : 'NEW',
    createdAt: new Date(user.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(user.updatedAt || user.createdAt || Date.now()).toISOString(),
  }
}

export function SourceCrmView({ onNavigate }: { onNavigate?: (view: 'leads' | 'whatsapp') => void }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api('/api/admin/users'),
      api('/api/admin/orders'),
      api('/api/admin/staff').catch(() => ({ staff: [] })),
    ]).then(([usersResult, ordersResult, staffResult]) => {
      if (!active) return
      const users = usersResult.users || []
      const orders = ordersResult.orders || []
      const grouped = new Map<string, any[]>()
      orders.forEach((order: any) => {
        const key = String(order.customerId || order.customerEmail || order.customerName || '')
        if (key) grouped.set(key, [...(grouped.get(key) || []), order])
      })
      const mappedUsers = users.map((user: any) => {
        const key = String(user._id || user.id || user.email || '')
        return toLead(user, grouped.get(key) || grouped.get(String(user.email || '')) || [])
      })
      const known = new Set(mappedUsers.map((lead: Lead) => lead.id))
      const guestLeads = orders
        .filter((order: any) => !known.has(String(order.customerId || '')) && !users.some((user: any) => user.email && user.email === order.customerEmail))
        .map((order: any) => toLead(order, [order]))
      setLeads([...mappedUsers, ...guestLeads])
      const staff = staffResult.staff || staffResult.users || []
      setSeats(staff.map((person: any, index: number) => ({
        id: String(person._id || person.id || person.email || index),
        name: person.name || person.email || `Team member ${index + 1}`,
        seatNumber: index + 1,
        assignedUserId: String(person._id || person.id || ''),
        assignedUserName: person.name || '',
        assignedUserEmail: person.email || '',
        targetLeads: 0,
        assignedLeadsCount: 0,
        specialization: 'GENERAL',
        status: person.status === 'SUSPENDED' ? 'INACTIVE' : 'ACTIVE',
      })))
    }).catch((e: any) => { if (active) setError(e.message || 'Could not load PlayBeat customer records.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading lead and customer records…</div>
  return <div className="space-y-3">
    {error && <div role="alert" className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error} The enterprise CRM remains open, but customer data may be incomplete.</div>}
    <EnterpriseCrmDashboard leads={leads} seats={seats} currentUser={null}
      onSelectLead={() => onNavigate?.('leads')}
      onNavigateToOutreach={() => onNavigate?.('whatsapp')} />
  </div>
}
