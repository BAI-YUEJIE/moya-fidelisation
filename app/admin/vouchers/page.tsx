'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

type Reward = {
  id: string
  name: string
}

type Voucher = {
  id: string
  token: string
  status: 'unused' | 'used'
  created_at: string
  used_at: string | null
  rewards: {
    name: string
  }
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRewardId, setSelectedRewardId] = useState('')
  const [saving, setSaving] = useState(false)
  const [generated, setGenerated] = useState<Voucher | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const [{ data: vouchersData }, { data: rewardsData }] = await Promise.all([
      supabase
        .from('vouchers')
        .select('id, token, status, created_at, used_at, rewards(name)')
        .eq('type', 'promo')
        .order('created_at', { ascending: false }),
      supabase.from('rewards').select('id, name').order('name'),
    ])

    if (vouchersData) setVouchers(vouchersData as unknown as Voucher[])
    if (rewardsData) setRewards(rewardsData)
    setLoading(false)
  }

  async function handleGenerate() {
    if (!selectedRewardId) return
    setSaving(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('vouchers')
      .insert({ reward_id: selectedRewardId, type: 'promo' })
      .select('id, token, status, created_at, used_at, rewards(name)')
      .single()

    if (data) {
      setGenerated(data as unknown as Voucher)
      await loadData()
    }
    setSaving(false)
    setShowModal(false)
    setSelectedRewardId('')
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
            onClick={() => setShowModal(true)}
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            + Générer un code
          </button>
        </div>

        {vouchers.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucun code généré pour l'instant.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Récompense</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Généré le</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisé le</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">QR code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{voucher.rewards.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        voucher.status === 'unused'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {voucher.status === 'unused' ? 'Non utilisé' : 'Utilisé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(voucher.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {voucher.used_at ? new Date(voucher.used_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setGenerated(voucher)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
                      >
                        Afficher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal génération */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Générer un code cadeau</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

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

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedRewardId || saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal affichage QR */}
      {generated && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
            <div className="w-full flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{generated.rewards.name}</h2>
              <button onClick={() => setGenerated(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <QRCodeSVG value={generated.token} size={200} />

            <p className="text-xs text-gray-400 text-center">
              Présentez ce QR code au restaurant pour bénéficier du cadeau.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
