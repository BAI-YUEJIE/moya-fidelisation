'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

type Voucher = {
  id: string
  token: string
  status: 'unused' | 'used'
  created_at: string
  used_at: string | null
  rewards: {
    name: string
    points_cost: number
    image_url: string | null
  }
}

type Filter = 'all' | 'unused' | 'used'

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Voucher | null>(null)

  useEffect(() => {
    loadVouchers()
  }, [])

  async function loadVouchers() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('vouchers')
      .select('id, token, status, created_at, used_at, rewards(name, points_cost, image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setVouchers(data as unknown as Voucher[])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  const filtered = filter === 'all' ? vouchers : vouchers.filter(v => v.status === filter)

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mes bons</h1>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(['all', 'unused', 'used'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === f ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {{ all: 'Tous', unused: 'Valides', used: 'Utilisés' }[f]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucun bon pour l'instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((voucher) => (
              <div
                key={voucher.id}
                onClick={() => setSelected(voucher)}
                className={`bg-white rounded-xl shadow overflow-hidden flex items-center cursor-pointer hover:shadow-md transition-shadow ${
                  voucher.status === 'used' ? 'opacity-50' : ''
                }`}
              >
                {voucher.rewards.image_url ? (
                  <div className="relative h-20 w-20 shrink-0">
                    <Image src={voucher.rewards.image_url} alt={voucher.rewards.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 shrink-0 bg-gray-100 flex items-center justify-center text-2xl text-gray-300">
                    🎁
                  </div>
                )}
                <div className="flex-1 min-w-0 px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{voucher.rewards.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Obtenu le {new Date(voucher.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {voucher.status === 'used' && voucher.used_at && (
                      <p className="text-xs text-gray-400">
                        Utilisé le {new Date(voucher.used_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      voucher.status === 'unused'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {voucher.status === 'unused' ? 'Valide' : 'Utilisé'}
                    </span>
                    <span className="text-gray-300 text-sm">›</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
            <div className="w-full flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{selected.rewards.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {selected.rewards.image_url && (
              <div className="relative w-full h-36 rounded-lg overflow-hidden">
                <Image src={selected.rewards.image_url} alt={selected.rewards.name} fill className="object-cover" />
              </div>
            )}

            <div className={selected.status === 'used' ? 'opacity-40' : ''}>
              <QRCodeSVG value={selected.token} size={180} />
            </div>

            <div className="text-center">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                selected.status === 'unused'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {selected.status === 'unused' ? 'Valide — à présenter au restaurant' : 'Déjà utilisé'}
              </span>
              <p className="text-xs text-gray-400 mt-3">
                Obtenu le {new Date(selected.created_at).toLocaleDateString('fr-FR')}
              </p>
              {selected.status === 'used' && selected.used_at && (
                <p className="text-xs text-gray-400">
                  Utilisé le {new Date(selected.used_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
