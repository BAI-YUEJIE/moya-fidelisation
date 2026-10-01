'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTier } from '@/lib/utils'

// ---- helpers ----
function getMonthKey(iso: string) {
  return iso.slice(0, 7)
}

function monthShort(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'short' })
}

function nowYM(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function subtractMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 - n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let y = fy
  let m = fm
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

// ---- chart components ----
function BarChart({
  data,
  color,
  unit = '',
}: {
  data: { label: string; value: number }[]
  color: string
  unit?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const H = 130
  const padL = 34
  const padB = 22
  const W = 560
  const n = data.length
  const slotW = (W - padL) / n
  const barW = Math.max(slotW - 8, 3)
  const showLabels = n <= 18
  const gridVals = [0, Math.ceil(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W + 4} ${H + padB}`} className="w-full" style={{ overflow: 'visible' }}>
      {gridVals.map((v, i) => {
        const y = H - (v / max) * H
        return (
          <g key={i}>
            <line x1={padL} x2={W + 4} y1={y} y2={y} stroke="#f0ebe4" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
              {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const bh = Math.max((d.value / max) * H, d.value > 0 ? 2 : 0)
        const x = padL + i * slotW + (slotW - barW) / 2
        const y = H - bh
        return (
          <g key={i} style={{ cursor: 'default' }}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill={color}>
              <title>{d.value.toLocaleString('fr-FR')}{unit ? ' ' + unit : ''}</title>
            </rect>
            {showLabels && (
              <text x={x + barW / 2} y={H + padB - 3} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {d.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function HBars({ items }: { items: { name: string; value: number }[] }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0" style={{ width: 155 }}>
            <span className="text-xs font-bold shrink-0" style={{ color: '#d1d5db', width: 16 }}>
              {i + 1}
            </span>
            <span className="text-xs truncate" style={{ color: '#6b7280' }} title={item.name}>
              {item.name}
            </span>
          </div>
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 10, backgroundColor: '#f5f3f0' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: '#f08816',
                opacity: Math.max(0.45, 0.9 - i * 0.1),
              }}
            />
          </div>
          <div className="text-xs font-semibold shrink-0 text-right" style={{ width: 36, color: '#1c1917' }}>
            {item.value}×
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- types ----
type ProfileRow = { created_at: string; points: number }
type PointsRow = { amount: number; created_at: string }
type VoucherRow = { reward_id: string; rewards: { name: string } | null }
type RangePreset = 3 | 6 | 12
type RangeMode = 'preset' | 'custom'

export default function StatsPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [pointsRows, setPointsRows] = useState<PointsRow[]>([])
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(true)

  const [rangeMode, setRangeMode] = useState<RangeMode>('preset')
  const [preset, setPreset] = useState<RangePreset>(12)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(nowYM())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [r1, r2, r3] = await Promise.all([
        supabase.from('profiles').select('created_at, points'),
        supabase.from('points_history').select('amount, created_at').gt('amount', 0),
        supabase.from('vouchers').select('reward_id, rewards(name)').eq('type', 'redemption'),
      ])
      setProfiles(r1.data ?? [])
      setPointsRows(r2.data ?? [])
      setVouchers((r3.data ?? []) as unknown as VoucherRow[])
      setLoading(false)
    }
    load()
  }, [])

  // effective date range
  const { effectiveFrom, effectiveTo } = useMemo(() => {
    const to = nowYM()
    if (rangeMode === 'custom' && customFrom && customTo && customFrom <= customTo) {
      return { effectiveFrom: customFrom, effectiveTo: customTo }
    }
    return { effectiveFrom: subtractMonths(to, preset - 1), effectiveTo: to }
  }, [rangeMode, customFrom, customTo, preset])

  const months = useMemo(
    () => getMonthsBetween(effectiveFrom, effectiveTo),
    [effectiveFrom, effectiveTo]
  )

  const registrations = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of profiles) {
      const k = getMonthKey(p.created_at)
      if (k >= effectiveFrom && k <= effectiveTo) map[k] = (map[k] ?? 0) + 1
    }
    return months.map(m => ({ label: monthShort(m), value: map[m] ?? 0 }))
  }, [profiles, months, effectiveFrom, effectiveTo])

  const pointsByMonth = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of pointsRows) {
      const k = getMonthKey(p.created_at)
      if (k >= effectiveFrom && k <= effectiveTo) map[k] = (map[k] ?? 0) + p.amount
    }
    return months.map(m => ({ label: monthShort(m), value: map[m] ?? 0 }))
  }, [pointsRows, months, effectiveFrom, effectiveTo])

  const topRewards = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {}
    for (const v of vouchers) {
      if (!map[v.reward_id]) map[v.reward_id] = { name: v.rewards?.name ?? '—', count: 0 }
      map[v.reward_id].count++
    }
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(r => ({ name: r.name, value: r.count }))
  }, [vouchers])

  const tiers = useMemo(() => {
    const total = profiles.length || 1
    const bronze = profiles.filter(p => getTier(p.points).label === 'Bronze').length
    const silver = profiles.filter(p => getTier(p.points).label === 'Silver').length
    const gold = profiles.filter(p => getTier(p.points).label === 'Gold').length
    return [
      { label: 'Bronze', count: bronze, pct: Math.round((bronze / total) * 100), color: '#b45309' },
      { label: 'Silver', count: silver, pct: Math.round((silver / total) * 100), color: '#6b7280' },
      { label: 'Gold', count: gold, pct: Math.round((gold / total) * 100), color: '#b8860b' },
    ]
  }, [profiles])

  const kpis = useMemo(() => {
    const newInPeriod = profiles.filter(p => {
      const k = getMonthKey(p.created_at)
      return k >= effectiveFrom && k <= effectiveTo
    }).length
    const pointsInPeriod = pointsRows
      .filter(p => {
        const k = getMonthKey(p.created_at)
        return k >= effectiveFrom && k <= effectiveTo
      })
      .reduce((s, p) => s + p.amount, 0)
    return [
      { label: 'membres inscrits', value: profiles.length },
      { label: 'points en circulation', value: profiles.reduce((s, p) => s + p.points, 0) },
      { label: 'nouvelles inscriptions', value: newInPeriod },
      { label: 'points distribués', value: pointsInPeriod },
    ]
  }, [profiles, pointsRows, effectiveFrom, effectiveTo])

  const periodLabel = useMemo(() => {
    if (rangeMode === 'custom' && customFrom && customTo) {
      return `${customFrom} → ${customTo}`
    }
    return `${preset} mois`
  }, [rangeMode, customFrom, customTo, preset])

  if (loading) {
    return (
      <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
        <div className="max-w-5xl mx-auto flex flex-col gap-5">
          <div className="skeleton h-10 w-48 rounded-xl pt-2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[0, 1].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
          <div className="skeleton h-52 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-5 animate-fade-in">

        {/* Header + range selector */}
        <div className="flex items-start justify-between pt-2 flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Administration</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Statistiques</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Quick range buttons */}
            <div className="flex gap-1 p-1 rounded-xl bg-white shadow-sm">
              {([3, 6, 12] as RangePreset[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setPreset(r); setRangeMode('preset') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={
                    rangeMode === 'preset' && preset === r
                      ? { backgroundColor: '#f08816', color: '#ffffff' }
                      : { color: '#9ca3af' }
                  }
                >
                  {r} mois
                </button>
              ))}
              <button
                onClick={() => {
                  setRangeMode('custom')
                  if (!customFrom) setCustomFrom(subtractMonths(nowYM(), 11))
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={
                  rangeMode === 'custom'
                    ? { backgroundColor: '#f08816', color: '#ffffff' }
                    : { color: '#9ca3af' }
                }
              >
                Personnalisé
              </button>
            </div>
            {/* Custom date range */}
            {rangeMode === 'custom' && (
              <div
                className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-2"
                style={{ border: '1px solid #f0ebe4' }}
              >
                <span className="text-xs" style={{ color: '#9ca3af' }}>De</span>
                <input
                  type="month"
                  value={customFrom}
                  max={customTo || nowYM()}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="text-xs outline-none"
                  style={{ color: '#1c1917', border: 'none', background: 'transparent' }}
                />
                <span className="text-xs" style={{ color: '#9ca3af' }}>à</span>
                <input
                  type="month"
                  value={customTo}
                  min={customFrom}
                  max={nowYM()}
                  onChange={e => setCustomTo(e.target.value)}
                  className="text-xs outline-none"
                  style={{ color: '#1c1917', border: 'none', background: 'transparent' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{k.value.toLocaleString('fr-FR')}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{k.label}</p>
              {i >= 2 && (
                <p className="text-xs mt-0.5 font-medium" style={{ color: '#f08816' }}>{periodLabel}</p>
              )}
            </div>
          ))}
        </div>

        {/* Tier distribution */}
        <div className="grid grid-cols-3 gap-3">
          {tiers.map(t => (
            <div
              key={t.label}
              className="bg-white rounded-2xl shadow-sm p-4"
              style={{ borderLeft: `3px solid ${t.color}` }}
            >
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold" style={{ color: t.color }}>{t.count}</p>
                <p className="text-xs font-semibold" style={{ color: t.color }}>{t.pct}%</p>
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{t.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">Inscriptions</p>
            <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>Nouveaux membres par mois</p>
            <BarChart data={registrations} color="#f08816" unit="membre(s)" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">Points distribués</p>
            <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>Points gagnés par mois</p>
            <BarChart data={pointsByMonth} color="#6366f1" unit="pts" />
          </div>
        </div>

        {/* Top rewards */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">Récompenses les plus échangées</p>
          <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>
            Top 5 — toutes périodes confondues
          </p>
          {topRewards.length > 0 ? (
            <HBars items={topRewards} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: '#9ca3af' }}>Aucun échange enregistré.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
