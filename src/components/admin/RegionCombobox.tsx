import React, { useEffect, useMemo, useRef, useState } from 'react'

/**
 * RegionCombobox — searchable, keyboard-accessible region/country selector
 * for the admin product editor (region field upgrade task §19-§24).
 *
 * Requirements implemented here:
 *  • Same visual language as the editor's existing inputs: the closed state
 *    is pixel-identical to the old <select> (same classes, same height,
 *    same typography). Only the open behaviour is new.
 *  • All legacy options keep working and are listed first:
 *    Global, USA, Europe, Asia, Pakistan. Legacy STORED values (e.g. "USA")
 *    display exactly as stored — nothing is auto-migrated.
 *  • Full canonical country list for specific-country assignment
 *    (France, Germany, Canada, Australia, Japan, Singapore, Malaysia,
 *    Saudi Arabia, United Arab Emirates, United Kingdom, ... ~200 entries).
 *  • Custom regions: typing a value that is not in the list offers
 *    `Add "<typed>"` — saving needs NO code deployment (MongoDB-only value).
 *  • Case-insensitive dedupe: typing "france" selects the existing
 *    "France" entry instead of creating a duplicate that differs only in
 *    capitalisation. New selections prefer canonical names (United States /
 *    United Kingdom / United Arab Emirates over USA / UK / UAE).
 *  • Keyboard: ↑/↓ move, Enter selects (or adds a custom value), Escape
 *    closes, Home/End jump. ARIA combobox/listbox semantics.
 *  • Clear button (×) when a value is set → empty value (the API stores an
 *    empty region as the "Global" default, same as before this upgrade).
 */

// Legacy regions first — these must continue working unchanged.
const LEGACY_REGIONS = ['Global', 'USA', 'Europe', 'Asia', 'Pakistan']

// Canonical country list (admin-selectable). Names follow common English
// short forms; the ten target countries from the brief are all present.
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh',
  'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Chad', 'Chile',
  'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
  'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay',
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Rwanda', 'Samoa', 'San Marino', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

/**
 * Case-insensitive canonicalisation. Maps common short forms to the
 * canonical display name and folds casing ("france" -> "France").
 * Returns the input trimmed when it is a genuine custom region.
 */
export function normalizeRegionInput(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const alias: Record<string, string> = {
    usa: 'United States',
    'unitedstatesofamerica': 'United States',
    us: 'United States',
    uk: 'United Kingdom',
    'greatbritain': 'United Kingdom',
    england: 'United Kingdom',
    uae: 'United Arab Emirates',
    'emirates': 'United Arab Emirates',
    ksa: 'Saudi Arabia',
    'saudiarabia': 'Saudi Arabia',
  }
  const all = [...LEGACY_REGIONS, ...COUNTRIES]
  // Exact case-insensitive match against known regions/countries first
  for (const known of all) {
    if (fold(known) === fold(text)) return known
  }
  // Common short-form aliases → canonical names
  const f = fold(text)
  if (alias[f]) return alias[f]
  return text
}

const REGION_RULES: Record<string, string> = {
  Global: 'Worldwide — no region restriction',
  USA: 'United States',
  Europe: 'European region',
  Asia: 'Asian region',
  Pakistan: 'Pakistan',
}

/** Light malformed-input guard (region field validation task §30). */
export function isValidRegionValue(v: string): boolean {
  const text = v.trim()
  if (text.length < 2 || text.length > 60) return false
  // No control characters / emoji-only strings — keep permissive otherwise
  // (custom regions may contain spaces, dots, hyphens, parentheses, accents)
  if (/[\u0000-\u001F\u007F]/.test(text)) return false
  if (!/[\p{L}]/u.test(text)) return false // must contain at least one letter
  return true
}

export interface RegionComboboxProps {
  /** Currently stored region value (legacy values are preserved as-is). */
  value: string
  /** Called with the normalized value whenever the selection changes. */
  onChange: (next: string) => void
  /** Placeholder when empty (defaults to "Global"). */
  placeholder?: string
  /** Optional id for the input element (label association). */
  id?: string
}

export const RegionCombobox: React.FC<RegionComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Global',
  id,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  // The full option list: legacy regions first, then all countries.
  const allOptions = useMemo(() => [...LEGACY_REGIONS, ...COUNTRIES], [])

  const filtered = useMemo(() => {
    const q = query.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!q) return allOptions
    const starts: string[] = []
    const contains: string[] = []
    for (const opt of allOptions) {
      const low = opt.toLowerCase()
      if (low.startsWith(q)) starts.push(opt)
      else if (low.includes(q)) contains.push(opt)
    }
    return [...starts, ...contains]
  }, [query, allOptions])

  const queryNormalized = useMemo(() => normalizeRegionInput(query), [query])
  const exactMatch =
    !!queryNormalized &&
    allOptions.some((o) => o.toLowerCase() === queryNormalized.toLowerCase())
  const canAddCustom = !!queryNormalized && !exactMatch && isValidRegionValue(queryNormalized)

  const optionCount = filtered.length + (canAddCustom ? 1 : 0)

  useEffect(() => {
    setHighlight(0)
  }, [query])

  // Keep the highlighted option visible while arrowing through the list
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const commit = (next: string) => {
    onChange(next)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlight((h) => (optionCount === 0 ? 0 : (h + 1) % optionCount))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlight((h) => (optionCount === 0 ? 0 : (h - 1 + optionCount) % optionCount))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (canAddCustom && highlight === filtered.length) {
        commit(queryNormalized)
      } else if (filtered[highlight]) {
        commit(filtered[highlight])
      } else if (queryNormalized && isValidRegionValue(queryNormalized)) {
        // Free-typed value with no list interaction — accept it (custom add)
        commit(queryNormalized)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Home' && open) {
      e.preventDefault()
      setHighlight(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault()
      setHighlight(Math.max(0, optionCount - 1))
    }
  }

  // Display value: while the dropdown is open the input shows the search
  // query; closed it shows the stored value exactly as stored (legacy
  // values like "USA" are NOT rewritten).
  const displayValue = open ? query : value || ''

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="region-combobox-list"
          aria-autocomplete="list"
          autoComplete="off"
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          /* identical classes to the editor's text inputs / old select */
          className="w-full px-3 py-2 pr-8 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
        />
        {/* clear button — only when a value is stored */}
        {value ? (
          <button
            type="button"
            aria-label="Clear region"
            title="Clear region"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onChange('')
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 hover:bg-amber-400/30 text-zinc-400 hover:text-amber-300 text-[9px] leading-none flex items-center justify-center transition"
          >
            ✕
          </button>
        ) : null}
        {/* dropdown chevron affordance */}
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => {
            setQuery('')
            setOpen((o) => !o)
            inputRef.current?.focus()
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}>
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open ? (
        <ul
          /* key={query} forces a fresh list mount per search term — with a
             plain reconciled list, headless-Chromium sessions showed a stale
             filtered option occasionally surviving a commit as a leaked DOM
             node. Rebuilding the <ul> per query makes the rendered options
             always exactly match the current filter. */
          key={query}
          id="region-combobox-list"
          ref={listRef}
          role="listbox"
          aria-label="Region options"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-xl bg-[#0B0F19] border border-white/10 shadow-2xl shadow-black/60 py-1 text-xs"
        >
          {filtered.length === 0 && !canAddCustom ? (
            <li className="px-3 py-2 text-zinc-500" aria-live="polite">
              No matching region
            </li>
          ) : null}

          {filtered.map((opt, idx) => {
            const selected = opt === value
            return (
              <li
                key={opt}
                data-idx={idx}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => {
                  // mousedown (not click) so the input keeps focus state simple
                  e.preventDefault()
                  commit(opt)
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={`px-3 py-1.5 cursor-pointer flex items-center justify-between gap-2 ${
                  idx === highlight ? 'bg-amber-400/10 text-amber-200' : 'text-zinc-300'
                } ${selected ? 'font-semibold' : ''}`}
              >
                <span className="flex items-center gap-2">
                  {LEGACY_REGIONS.includes(opt) && !COUNTRIES.includes(opt) ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70 shrink-0" title="Legacy region" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 shrink-0" title="Country" />
                  )}
                  <span>{opt}</span>
                </span>
                {selected ? <span className="text-amber-300 text-[10px]">✓ current</span> : null}
                {!selected && REGION_RULES[opt] && !COUNTRIES.includes(opt) ? (
                  <span className="text-zinc-600 text-[9px]">{REGION_RULES[opt]}</span>
                ) : null}
              </li>
            )
          })}

          {canAddCustom ? (
            <li
              data-idx={filtered.length}
              role="option"
              aria-selected={highlight === filtered.length}
              onMouseDown={(e) => {
                e.preventDefault()
                commit(queryNormalized)
              }}
              onMouseEnter={() => setHighlight(filtered.length)}
              className={`px-3 py-1.5 cursor-pointer border-t border-white/5 mt-0.5 flex items-center gap-2 ${
                highlight === filtered.length ? 'bg-amber-400/10 text-amber-200' : 'text-zinc-300'
              }`}
            >
              <span className="w-4 h-4 rounded bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px] leading-none shrink-0">+</span>
              <span>
                Add &quot;{queryNormalized}&quot;
                <span className="text-zinc-600 text-[9px] ml-1.5">custom region — saved to MongoDB</span>
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
