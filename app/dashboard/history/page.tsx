'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type HistoryEntry = {
  id: string
  amount: number
  reason: string
  description: string | null
  created_at: string
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

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('points_history')
        .select('id, amount, reason, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setHistory(data)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Historique des points</h1>

        {history.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucun historique pour l'instant.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="divide-y divide-gray-100">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getLabel(entry)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${entry.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
