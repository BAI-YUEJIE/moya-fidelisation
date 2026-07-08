'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type HistoryEntry = {
  id: string
  amount: number
  reason: string
  description: string | null
  created_at: string
}

type Filter = 'tous' | 'gains' | 'depenses'

type Profile = {
  points: number
}

const reasonLabels: Record<string, string> = {
  inscription: 'Bonus de bienvenue',
  échange: 'Récompense obtenue',
  ajout_manuel: 'Points offerts',
  retrait_manuel: 'Correction de points',
}

function getLabel(entry: HistoryEntry): string {
  const base = reasonLabels[entry.reason] ?? entry.reason
  if (entry.reason === 'échange' && entry.description) return `${base} — ${entry.description}`
  return base
}

function formatDateTime(dateStr: string): string {
  const [date, time] = dateStr.split('T')
  const [y, m, d] = date.split('-')
  const hhmm = time?.slice(0, 5) ?? ''
  return `${d}/${m}/${y}${hhmm ? ' · ' + hhmm : ''}`
}

function getMonthKey(dateStr: string): string {
  const [y, m] = dateStr.split('T')[0].split('-')
  return `${y}-${m}`
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  return `${months[parseInt(m) - 1]} ${y}`
}

function IconReason({ reason }: { reason: string }) {
  if (reason === 'inscription') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
  if (reason === 'échange') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  )
  if (reason === 'ajout_manuel') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('tous')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: historyData }, { data: profileData }] = await Promise.all([
        supabase
          .from('points_history')
          .select('id, amount, reason, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('points').eq('id', user.id).single(),
      ])

      if (historyData) setHistory(historyData)
      if (profileData) setProfile(profileData)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = useMemo(() => {
    if (filter === 'gains') return history.filter(e => e.amount > 0)
    if (filter === 'depenses') return history.filter(e => e.amount < 0)
    return history
  }, [history, filter])

  const stats = useMemo(() => ({
    gained: history.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    spent: history.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0),
  }), [history])

  // Groupement par mois
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>()
    for (const entry of filtered) {
      const key = getMonthKey(entry.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return Array.from(map.entries())
  }, [filtered])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'gains', label: 'Gains' },
    { key: 'depenses', label: 'Dépenses' },
  ]

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="pt-2">
          <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Suivi</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Historique des points</h1>
        </div>

        {/* Carte résumé */}
        {profile && (
          <div
            className="rounded-2xl p-5 grid grid-cols-3 gap-3"
            style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{profile.points}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>solde actuel</p>
            </div>
            <div className="text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>+{stats.gained}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>cumulés</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#f87171' }}>-{stats.spent}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>dépensés</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={filter === key
                ? { backgroundColor: '#1c1917', color: '#ffffff' }
                : { backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid #f0ebe4' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Liste groupée par mois */}
        {grouped.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-sm" style={{ color: '#9ca3af' }}>Aucun historique pour l'instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(([monthKey, entries]) => (
              <div key={monthKey}>
                {/* Label du mois */}
                <p className="text-xs font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: '#9ca3af' }}>
                  {formatMonthLabel(monthKey)}
                </p>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {entries.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 px-5 py-4"
                      style={i < entries.length - 1 ? { borderBottom: '1px solid #f5f3f0' } : {}}
                    >
                      {/* Icône */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={entry.amount > 0
                          ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                          : { backgroundColor: '#fff1f2', color: '#ef4444' }
                        }
                      >
                        <IconReason reason={entry.reason} />
                      </div>

                      {/* Label + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{getLabel(entry)}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                          {formatDateTime(entry.created_at)}
                        </p>
                      </div>

                      {/* Montant */}
                      <span
                        className="text-sm font-bold shrink-0"
                        style={{ color: entry.amount > 0 ? '#16a34a' : '#ef4444' }}
                      >
                        {entry.amount > 0 ? `+${entry.amount}` : entry.amount} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
