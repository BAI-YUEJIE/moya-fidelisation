'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  }
}

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVouchers()
  }, [])

  async function loadVouchers() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('vouchers')
      .select('id, token, status, created_at, used_at, rewards(name, points_cost)')
      .eq('user_id', user.id)
      .eq('type', 'redemption')
      .order('created_at', { ascending: false })

    if (data) setVouchers(data as Voucher[])
    setLoading(false)
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes bons</h1>

        {vouchers.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucun bon pour l'instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className={`bg-white rounded-xl shadow p-5 flex items-center gap-6 ${
                  voucher.status === 'used' ? 'opacity-50' : ''
                }`}
              >
                <div className="shrink-0">
                  <QRCodeSVG value={voucher.token} size={96} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{voucher.rewards.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{voucher.rewards.points_cost} points</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Obtenu le {new Date(voucher.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {voucher.status === 'used' && voucher.used_at && (
                    <p className="text-xs text-gray-400">
                      Utilisé le {new Date(voucher.used_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    voucher.status === 'unused'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {voucher.status === 'unused' ? 'Valide' : 'Utilisé'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
