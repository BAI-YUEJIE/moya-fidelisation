'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  name: string
  email: string
  birthday: string
  points: number
  created_at: string
}

type ModalState = {
  member: Member
  action: 'ajouter' | 'retirer'
  amount: string
} | null

function isBirthdayToday(birthday: string): boolean {
  const today = new Date()
  const date = new Date(birthday)
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0].split('-').reverse().join('/')
}

function getTier(points: number) {
  if (points >= 500) return { label: 'Gold', color: '#b8860b', bg: 'rgba(184,134,11,0.1)' }
  if (points >= 200) return { label: 'Silver', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }
  return { label: 'Bronze', color: '#b45309', bg: 'rgba(180,83,9,0.1)' }
}

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('members_view')
      .select('id, name, email, birthday, points, created_at')
      .order('created_at', { ascending: false })

    if (data) setMembers(data)
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
      supabase.from('points_history').insert({
        user_id: modal.member.id,
        amount: historyAmount,
        reason: modal.action === 'ajouter' ? 'ajout_manuel' : 'retrait_manuel',
        description: null,
      }),
    ])

    setSaving(false)
    setModal(null)
    await loadMembers()
  }

  const filtered = useMemo(() =>
    members.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    ), [members, search])

  const stats = useMemo(() => ({
    total: members.length,
    birthdays: members.filter(m => isBirthdayToday(m.birthday)).length,
    totalPoints: members.reduce((s, m) => s + m.points, 0),
  }), [members])

  const previewPoints = modal
    ? modal.action === 'ajouter'
      ? modal.member.points + (parseInt(modal.amount) || 0)
      : Math.max(modal.member.points - (parseInt(modal.amount) || 0), 0)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="pt-2">
          <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Administration</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Membres</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'membres', value: stats.total },
            { label: "anniversaire aujourd'hui", value: stats.birthdays },
            { label: 'points distribués', value: stats.totalPoints },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recherche */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white shadow-sm outline-none"
            style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
          />
        </div>

        {/* Table desktop */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden hidden md:block">
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid #f5f3f0' }}>
              <tr>
                {['Membre', 'Email', 'Naissance', 'Points', 'Inscrit le', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member, i) => {
                const birthday = isBirthdayToday(member.birthday)
                const tier = getTier(member.points)
                return (
                  <tr
                    key={member.id}
                    style={{
                      borderTop: i > 0 ? '1px solid #f5f3f0' : undefined,
                      backgroundColor: birthday ? 'rgba(240,136,22,0.04)' : undefined,
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: '#f08816' }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1.5">
                            {member.name}
                            {birthday && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fff7ed', color: '#f08816' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 8 7 8 10a4 4 0 0 0 8 0c0-3-4-8-4-8z"/><rect x="3" y="17" width="18" height="5" rx="1"/><line x1="7" y1="17" x2="7" y2="14" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="17" x2="12" y2="14" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="17" x2="17" y2="14" stroke="currentColor" strokeWidth="2"/></svg>
                                Anniversaire
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6b7280' }}>{member.email}</td>
                    <td className="px-4 py-3" style={{ color: '#6b7280' }}>{formatDate(member.birthday)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{member.points}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: tier.bg, color: tier.color }}>
                          {tier.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6b7280' }}>{formatDate(member.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModal({ member, action: 'ajouter', amount: '' })}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
                      >
                        Gérer les points
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>Aucun membre trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="flex flex-col gap-3 md:hidden">
          {filtered.map(member => {
            const birthday = isBirthdayToday(member.birthday)
            const tier = getTier(member.points)
            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
                style={birthday ? { border: '1px solid rgba(240,136,22,0.3)' } : {}}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: '#f08816' }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                  <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-gray-900">{member.points} pts</span>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tier.bg, color: tier.color }}>{tier.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => setModal({ member, action: 'ajouter', amount: '' })}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                  style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
                >
                  Points
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <p className="text-sm" style={{ color: '#9ca3af' }}>Aucun membre trouvé.</p>
            </div>
          )}
        </div>

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
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: '#f08816' }}
              >
                {modal.member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{modal.member.name}</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Solde actuel : <span className="font-semibold text-gray-700">{modal.member.points} pts</span></p>
              </div>
            </div>

            {/* Toggle ajouter / retirer */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: '#f5f3f0' }}>
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
