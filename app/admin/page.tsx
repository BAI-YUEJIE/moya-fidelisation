'use client'

import { useEffect, useState } from 'react'
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
  return (
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('members_view')
      .select('id, name, email, birthday, points, created_at')
      .order('created_at', { ascending: false })

    if (data) setMembers(data)
    setLoading(false)
  }

  function openModal(member: Member) {
    setModal({ member, action: 'ajouter', amount: '' })
  }

  function closeModal() {
    setModal(null)
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

    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', modal.member.id)

    setSaving(false)
    closeModal()
    await loadMembers()
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
          <span className="text-sm text-gray-500">{members.length} membres</span>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date de naissance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Points</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Inscrit le</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const birthday = isBirthdayToday(member.birthday)
                return (
                  <tr key={member.id} className={birthday ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {member.name}
                      {birthday && (
                        <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                          🎂 Anniversaire
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(member.birthday)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{member.points}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(member.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openModal(member)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
                      >
                        Gérer les points
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {members.length === 0 && (
            <p className="text-center text-gray-400 py-12">Aucun membre pour l'instant.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{modal.member.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Solde actuel : <span className="font-medium text-gray-800">{modal.member.points} points</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModal({ ...modal, action: 'ajouter' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  modal.action === 'ajouter'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Ajouter
              </button>
              <button
                onClick={() => setModal({ ...modal, action: 'retirer' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  modal.action === 'retirer'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Retirer
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nombre de points</label>
              <input
                type="number"
                min="1"
                value={modal.amount}
                onChange={(e) => setModal({ ...modal, amount: e.target.value })}
                placeholder="ex: 50"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={closeModal}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !modal.amount}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
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
