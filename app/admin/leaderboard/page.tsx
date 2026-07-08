'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  name: string
  points: number
  birthday: string
  created_at: string
  redemption_count: number
  last_activity: string | null
}

type ModalState = {
  member: Member
  action: 'ajouter' | 'retirer'
  amount: string
} | null

function getTier(points: number) {
  if (points >= 500) return { label: 'Gold',   color: '#b8860b', bg: 'rgba(184,134,11,0.1)',  bar: '#b8860b', min: 500, next: 500 }
  if (points >= 200) return { label: 'Silver', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', bar: '#6b7280', min: 200, next: 500 }
  return              { label: 'Bronze', color: '#b45309', bg: 'rgba(180,83,9,0.1)',   bar: '#b45309', min: 0,   next: 200 }
}

function isBirthdayToday(birthday: string): boolean {
  if (!birthday) return false
  const today = new Date()
  const date = new Date(birthday)
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

function getMembershipDuration(created_at: string): string {
  const days = Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000)
  if (days >= 365) return `${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
  if (days >= 30) return `${Math.floor(days / 30)} mois`
  return `${days} j`
}

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return '—'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} j`
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`
  return `Il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
}

const rankStyle = [
  { color: '#b8860b', bg: 'rgba(184,134,11,0.15)', border: 'rgba(184,134,11,0.35)' },
  { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'transparent' },
  { color: '#b45309', bg: 'rgba(180,83,9,0.15)',    border: 'transparent' },
]

function BirthdayBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fff7ed', color: '#f08816' }}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c0 0-3 4-3 7a3 3 0 0 0 6 0c0-3-3-7-3-7z"/>
        <rect x="3" y="17" width="18" height="5" rx="1"/>
        <line x1="12" y1="17" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
      Anniv.
    </span>
  )
}

export default function LeaderboardPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<'tous' | 'Bronze' | 'Silver' | 'Gold'>('tous')
  const [sortBy, setSortBy] = useState<'points-desc' | 'points-asc' | 'anciennete' | 'echanges' | 'nom'>('points-desc')
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const [{ data: profilesData }, { data: vouchersData }, { data: historyData }] = await Promise.all([
      supabase.from('profiles').select('id, name, points, birthday, created_at').order('points', { ascending: false }),
      supabase.from('vouchers').select('user_id').eq('type', 'redemption'),
      supabase.from('points_history').select('user_id, created_at').order('created_at', { ascending: false }),
    ])
    if (profilesData) {
      const countMap: Record<string, number> = {}
      vouchersData?.forEach(v => { if (v.user_id) countMap[v.user_id] = (countMap[v.user_id] ?? 0) + 1 })

      const lastActivityMap: Record<string, string> = {}
      historyData?.forEach(h => {
        if (h.user_id && !lastActivityMap[h.user_id]) lastActivityMap[h.user_id] = h.created_at
      })

      setMembers(profilesData.map(m => ({
        ...m,
        redemption_count: countMap[m.id] ?? 0,
        last_activity: lastActivityMap[m.id] ?? null,
      })))
    }
    setLoading(false)
  }

  async function handleConfirm() {
    if (!modal || !modal.amount) return
    const amount = parseInt(modal.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    const supabase = createClient()
    const newPoints = modal.action === 'ajouter'
      ? modal.member.points + amount
      : Math.max(modal.member.points - amount, 0)
    const historyAmount = modal.action === 'ajouter' ? amount : -Math.min(amount, modal.member.points)
    await Promise.all([
      supabase.from('profiles').update({ points: newPoints }).eq('id', modal.member.id),
      supabase.from('points_history').insert({ user_id: modal.member.id, amount: historyAmount, reason: modal.action === 'ajouter' ? 'ajout_manuel' : 'retrait_manuel', description: null }),
    ])
    setSaving(false)
    setModal(null)
    await loadData()
  }

  const stats = useMemo(() => ({
    total: members.length,
    bronze: members.filter(m => getTier(m.points).label === 'Bronze').length,
    silver: members.filter(m => getTier(m.points).label === 'Silver').length,
    gold: members.filter(m => getTier(m.points).label === 'Gold').length,
    birthdays: members.filter(m => isBirthdayToday(m.birthday)).length,
    totalPoints: members.reduce((s, m) => s + m.points, 0),
  }), [members])

  const filtered = useMemo(() => {
    let list = [...members]
    if (search) list = list.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    if (filterTier !== 'tous') list = list.filter(m => getTier(m.points).label === filterTier)
    if (sortBy === 'points-desc') list.sort((a, b) => b.points - a.points)
    if (sortBy === 'points-asc') list.sort((a, b) => a.points - b.points)
    if (sortBy === 'anciennete') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sortBy === 'echanges') list.sort((a, b) => b.redemption_count - a.redemption_count)
    if (sortBy === 'nom') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [members, search, filterTier, sortBy])

  const previewPoints = modal
    ? modal.action === 'ajouter'
      ? modal.member.points + (parseInt(modal.amount) || 0)
      : Math.max(modal.member.points - (parseInt(modal.amount) || 0), 0)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f3f0' }}>
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-5">

        {/* Hero header */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
          <svg className="absolute right-0 top-0 opacity-5 pointer-events-none" width="280" height="200" viewBox="0 0 280 200">
            <circle cx="240" cy="40" r="120" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="240" cy="40" r="80"  fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="240" cy="40" r="40"  fill="none" stroke="white" strokeWidth="1"/>
            <line x1="120" y1="0" x2="280" y2="160" stroke="white" strokeWidth="0.5"/>
            <line x1="160" y1="0" x2="280" y2="120" stroke="white" strokeWidth="0.5"/>
          </svg>
          <div className="relative">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#f08816' }}>Administration</p>
            <h1 className="text-2xl font-bold text-white">Classement</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-3 mt-4">
              <div>
                <p className="text-xl font-bold text-white">{stats.total}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Membres</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p className="text-xl font-bold" style={{ color: '#b45309' }}>{stats.bronze}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Bronze</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p className="text-xl font-bold" style={{ color: '#9ca3af' }}>{stats.silver}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Silver</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p className="text-xl font-bold" style={{ color: '#b8860b' }}>{stats.gold}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Gold</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p className="text-xl font-bold" style={{ color: '#f08816' }}>{stats.totalPoints.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Points cumulés</p>
              </div>
              {stats.birthdays > 0 && (
                <>
                  <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div>
                    <p className="text-xl font-bold" style={{ color: '#f08816' }}>{stats.birthdays}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Anniv. aujourd&apos;hui</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher un membre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterTier}
              onChange={e => setFilterTier(e.target.value as typeof filterTier)}
              className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            >
              <option value="tous">Tous niveaux</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            >
              <option value="points-desc">Points ↓</option>
              <option value="points-asc">Points ↑</option>
              <option value="anciennete">Ancienneté</option>
              <option value="echanges">Échanges</option>
              <option value="nom">Nom A–Z</option>
            </select>
          </div>
        </div>

        {/* Top 3 */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {top3.map((member, i) => {
              const tier = getTier(member.points)
              const birthday = isBirthdayToday(member.birthday)
              const progress = tier.label === 'Gold' ? 100 : Math.round(((member.points - tier.min) / (tier.next - tier.min)) * 100)
              const rs = rankStyle[i]
              return (
                <div
                  key={member.id}
                  onClick={() => setModal({ member, action: 'ajouter', amount: '' })}
                  className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer"
                  style={{ border: `2px solid ${rs.border}`, transition: 'box-shadow 0.15s, transform 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: rs.bg, color: rs.color }}>
                    #{i + 1}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{member.name}</p>
                    {birthday && <div className="mt-1 flex justify-center"><BirthdayBadge /></div>}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{member.points}</p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>points</p>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: tier.bg, color: tier.color }}>{tier.label}</span>
                  {tier.label !== 'Gold' && (
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#f0ebe4' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: tier.bar }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tableau */}
        {rest.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #f0ebe4' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid #f5f3f0' }}>
                  <tr>
                    {['Rang', 'Membre', 'Segment', 'Ancienneté', 'Échanges', 'Dernière activité', 'Points'].map((h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-3 text-xs font-semibold tracking-widest uppercase whitespace-nowrap ${i === 6 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#9ca3af' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map((member, i) => {
                    const tier = getTier(member.points)
                    const birthday = isBirthdayToday(member.birthday)
                    const progress = tier.label === 'Gold' ? 100 : Math.round(((member.points - tier.min) / (tier.next - tier.min)) * 100)
                    const globalRank = filtered.indexOf(member) + 1
                    return (
                      <tr
                        key={member.id}
                        onClick={() => setModal({ member, action: 'ajouter', amount: '' })}
                        className="cursor-pointer"
                        style={{
                          borderTop: '1px solid #f5f3f0',
                          backgroundColor: birthday ? 'rgba(240,136,22,0.04)' : undefined,
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={e => { if (!birthday) e.currentTarget.style.backgroundColor = '#fafaf9' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = birthday ? 'rgba(240,136,22,0.04)' : '' }}
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#9ca3af' }}>#{globalRank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: '#f08816' }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-medium text-gray-900">{member.name}</span>
                              {birthday && <BirthdayBadge />}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full w-fit" style={{ backgroundColor: tier.bg, color: tier.color }}>{tier.label}</span>
                            {tier.label !== 'Gold' && (
                              <div className="w-14 rounded-full h-1" style={{ backgroundColor: '#f0ebe4' }}>
                                <div className="h-1 rounded-full" style={{ width: `${progress}%`, backgroundColor: tier.bar }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#6b7280' }}>{getMembershipDuration(member.created_at)}</td>
                        <td className="px-4 py-3" style={{ color: '#6b7280' }}>{member.redemption_count}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: member.last_activity ? '#6b7280' : '#d1d5db' }}>
                          {formatLastActivity(member.last_activity)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{member.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid #f0ebe4' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Aucun membre trouvé.</p>
          </div>
        )}
      </div>

      {/* Modal points */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: '#f08816' }}>
                {modal.member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{modal.member.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    Solde : <span className="font-semibold text-gray-700">{modal.member.points} pts</span>
                  </p>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: getTier(modal.member.points).bg, color: getTier(modal.member.points).color }}>
                    {getTier(modal.member.points).label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#f5f3f0' }}>
              {(['ajouter', 'retirer'] as const).map(action => (
                <button
                  key={action}
                  onClick={() => setModal({ ...modal, action })}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors"
                  style={modal.action === action
                    ? { backgroundColor: '#ffffff', color: '#1c1917', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { color: '#9ca3af' }
                  }
                >
                  {action === 'ajouter' ? 'Ajouter' : 'Retirer'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#6b7280' }}>Nombre de points</label>
              <input
                type="number"
                min="1"
                value={modal.amount}
                onChange={e => setModal({ ...modal, amount: e.target.value })}
                placeholder="ex : 50"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
              />
            </div>

            {modal.amount && parseInt(modal.amount) > 0 && (
              <div className="px-4 py-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#f5f3f0' }}>
                <span className="text-xs" style={{ color: '#9ca3af' }}>Solde après modification</span>
                <span className="text-sm font-bold" style={{ color: modal.action === 'ajouter' ? '#16a34a' : '#ef4444' }}>
                  {previewPoints} pts
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !modal.amount || parseInt(modal.amount) <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#f08816', color: '#ffffff' }}
              >
                {saving ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
