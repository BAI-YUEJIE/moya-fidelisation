'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type Reward = {
  id: string
  name: string
}

type Member = {
  id: string
  name: string
  points: number
  created_at: string
}

type Voucher = {
  id: string
  status: 'unused' | 'used'
  created_at: string
  used_at: string | null
  rewards: { name: string }
  profiles: { name: string } | null
}

type Step = 1 | 2

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedRewardId, setSelectedRewardId] = useState('')
  const [saving, setSaving] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [minPoints, setMinPoints] = useState('')
  const [maxPoints, setMaxPoints] = useState('')
  const [minDays, setMinDays] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const [{ data: vouchersData }, { data: rewardsData }, { data: membersData }] = await Promise.all([
      supabase
        .from('vouchers')
        .select('id, status, created_at, used_at, rewards(name), profiles(name)')
        .eq('type', 'promo')
        .order('created_at', { ascending: false }),
      supabase.from('rewards').select('id, name').eq('type', 'cadeau').order('name'),
      supabase.from('profiles').select('id, name, points, created_at').order('name'),
    ])

    if (vouchersData) setVouchers(vouchersData as unknown as Voucher[])
    if (rewardsData) setRewards(rewardsData)
    if (membersData) setMembers(membersData)
    setLoading(false)
  }

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
      if (minPoints && m.points < parseInt(minPoints)) return false
      if (maxPoints && m.points > parseInt(maxPoints)) return false
      if (minDays) {
        const days = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000)
        if (days < parseInt(minDays)) return false
      }
      return true
    })
  }, [members, search, minPoints, maxPoints, minDays])

  const allSelected = filteredMembers.length > 0 && filteredMembers.every(m => selectedIds.has(m.id))

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredMembers.forEach(m => next.delete(m.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredMembers.forEach(m => next.add(m.id))
        return next
      })
    }
  }

  function toggleMember(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openModal() {
    setStep(1)
    setSelectedIds(new Set())
    setSelectedRewardId('')
    setSearch('')
    setMinPoints('')
    setMaxPoints('')
    setMinDays('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
  }

  async function handleSend() {
    if (!selectedRewardId || selectedIds.size === 0) return
    setSaving(true)

    const supabase = createClient()
    await supabase.from('vouchers').insert(
      Array.from(selectedIds).map(userId => ({
        reward_id: selectedRewardId,
        user_id: userId,
        type: 'promo',
      }))
    )

    await loadData()
    setSaving(false)
    closeModal()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Codes cadeaux</h1>
          <button
            onClick={openModal}
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            + Envoyer un cadeau
          </button>
        </div>

        {vouchers.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucun code cadeau envoyé pour l'instant.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Membre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Récompense</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Envoyé le</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{voucher.profiles?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{voucher.rewards.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        voucher.status === 'unused' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {voucher.status === 'unused' ? 'Non utilisé' : 'Utilisé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(voucher.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-gray-600">{voucher.used_at ? new Date(voucher.used_at).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Envoyer un cadeau</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {step === 1 ? `Étape 1 — Sélectionner les membres` : `Étape 2 — Choisir la récompense`}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {step === 1 ? (
              <>
                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Rechercher par nom..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black w-full"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Points min</label>
                      <input
                        type="number"
                        placeholder="ex: 100"
                        value={minPoints}
                        onChange={(e) => setMinPoints(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Points max</label>
                      <input
                        type="number"
                        placeholder="ex: 500"
                        value={maxPoints}
                        onChange={(e) => setMaxPoints(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Membre depuis (jours min)</label>
                      <input
                        type="number"
                        placeholder="ex: 30"
                        value={minDays}
                        onChange={(e) => setMinDays(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Member list */}
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="rounded"
                          />
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Points</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Membre depuis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMembers.map((member) => {
                        const days = Math.floor((Date.now() - new Date(member.created_at).getTime()) / 86400000)
                        const duration = days >= 30 ? `${Math.floor(days / 30)} mois` : `${days} j`
                        return (
                          <tr
                            key={member.id}
                            onClick={() => toggleMember(member.id)}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(member.id)}
                                onChange={() => toggleMember(member.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                            <td className="px-4 py-3 text-gray-600">{member.points}</td>
                            <td className="px-4 py-3 text-gray-500">{duration}</td>
                          </tr>
                        )
                      })}
                      {filteredMembers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucun membre trouvé</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {selectedIds.size} membre{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setStep(2)}
                    disabled={selectedIds.size === 0}
                    className="py-2 px-5 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    Suivant →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-6 flex flex-col gap-4 flex-1">
                  <p className="text-sm text-gray-600">
                    Récompense à envoyer à <span className="font-semibold">{selectedIds.size} membre{selectedIds.size > 1 ? 's' : ''}</span>
                  </p>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Récompense</label>
                    <select
                      value={selectedRewardId}
                      onChange={(e) => setSelectedRewardId(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Choisir une récompense...</option>
                      {rewards.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    ← Retour
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!selectedRewardId || saving}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? 'Envoi...' : `Envoyer à ${selectedIds.size} membre${selectedIds.size > 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
