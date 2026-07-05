'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

type Voucher = {
  id: string
  token: string
  status: 'unused' | 'used'
  created_at: string
  used_at: string | null
  expires_at: string | null
  rewards: {
    name: string
    points_cost: number
    image_url: string | null
  }
}

type Filter = 'valides' | 'expires' | 'tous'
type SortOrder = 'desc' | 'asc'

function isExpired(v: Voucher): boolean {
  return v.status === 'unused' && v.expires_at !== null && new Date(v.expires_at) < new Date()
}

function isValid(v: Voucher): boolean {
  return v.status === 'unused' && !isExpired(v)
}

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0].split('-').reverse().join('/')
}

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('valides')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selected, setSelected] = useState<Voucher | null>(null)

  useEffect(() => { loadVouchers() }, [])

  async function loadVouchers() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('vouchers')
      .select('id, token, status, created_at, used_at, expires_at, rewards(name, points_cost, image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setVouchers(data as unknown as Voucher[])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let list: Voucher[]
    if (filter === 'valides') list = vouchers.filter(isValid)
    else if (filter === 'expires') list = vouchers.filter(v => v.status === 'used' || isExpired(v))
    else list = vouchers

    // Tri : dans "tous", valides toujours en premier
    list = [...list].sort((a, b) => {
      if (filter === 'tous') {
        const aValid = isValid(a) ? 0 : 1
        const bValid = isValid(b) ? 0 : 1
        if (aValid !== bValid) return aValid - bValid
      }
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return list
  }, [vouchers, filter, sortOrder])

  const counts = useMemo(() => ({
    valides: vouchers.filter(isValid).length,
    expires: vouchers.filter(v => v.status === 'used' || isExpired(v)).length,
    tous: vouchers.length,
  }), [vouchers])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: 'valides', label: 'Valides' },
    { key: 'expires', label: 'Expirés' },
    { key: 'tous', label: 'Tous' },
  ]

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Mes récompenses</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Mes bons</h1>
          </div>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="px-3 py-2 rounded-xl text-sm bg-white shadow-sm outline-none"
            style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
          >
            <option value="desc">Plus récents</option>
            <option value="asc">Plus anciens</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={filter === key
                ? { backgroundColor: '#1c1917', color: '#ffffff' }
                : { backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid #f0ebe4' }
              }
            >
              {label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                style={filter === key
                  ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#f08816' }
                  : { backgroundColor: '#f5f3f0', color: '#9ca3af' }
                }
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center flex flex-col items-center gap-3">
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {filter === 'valides' ? "Vous n'avez pas encore de bon valide." : 'Aucun bon dans cette catégorie.'}
            </p>
            {filter === 'valides' && (
              <Link
                href="/dashboard/rewards"
                className="text-sm font-medium px-4 py-2 rounded-xl"
                style={{ backgroundColor: '#f08816', color: '#ffffff' }}
              >
                Voir les récompenses
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((voucher) => {
              const expired = isExpired(voucher)
              const inactive = voucher.status === 'used' || expired

              return (
                <div
                  key={voucher.id}
                  onClick={() => setSelected(voucher)}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden flex items-center cursor-pointer hover:shadow-md transition-shadow"
                  style={{ opacity: inactive ? 0.55 : 1 }}
                >
                  {/* Image */}
                  {voucher.rewards.image_url ? (
                    <div className="relative h-24 w-24 shrink-0">
                      <Image src={voucher.rewards.image_url} alt={voucher.rewards.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div
                      className="h-24 w-24 shrink-0 flex items-center justify-center relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 12 20 22 4 22 4 12"/>
                        <rect x="2" y="7" width="20" height="5"/>
                        <line x1="12" y1="22" x2="12" y2="7"/>
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                      </svg>
                    </div>
                  )}

                  {/* Contenu */}
                  <div className="flex-1 min-w-0 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{voucher.rewards.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                        Obtenu le {formatDate(voucher.created_at)}
                      </p>
                      {voucher.status === 'used' && voucher.used_at && (
                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                          Utilisé le {formatDate(voucher.used_at)}
                        </p>
                      )}
                      {expired && (
                        <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                          Expiré le {formatDate(voucher.expires_at!)}
                        </p>
                      )}
                      {!inactive && voucher.expires_at && (
                        <p className="text-xs font-medium" style={{ color: '#f08816' }}>
                          Expire le {formatDate(voucher.expires_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={
                          voucher.status === 'used'
                            ? { backgroundColor: '#f3f4f6', color: '#6b7280' }
                            : expired
                            ? { backgroundColor: '#fef2f2', color: '#ef4444' }
                            : { backgroundColor: '#f0fdf4', color: '#16a34a' }
                        }
                      >
                        {voucher.status === 'used' ? 'Utilisé' : expired ? 'Expiré' : 'Valide'}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Titre */}
            <div className="w-full flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Bon de récompense</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">{selected.rewards.name}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Image */}
            {selected.rewards.image_url && (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                <Image src={selected.rewards.image_url} alt={selected.rewards.name} fill className="object-cover" />
              </div>
            )}

            {/* QR code */}
            <div
              className="p-4 rounded-2xl"
              style={{
                border: '2px solid #f0ebe4',
                opacity: selected.status === 'used' || isExpired(selected) ? 0.3 : 1,
              }}
            >
              <QRCodeSVG value={selected.token} size={180} />
            </div>

            {/* Statut */}
            <div className="w-full text-center">
              <span
                className="inline-block text-sm font-medium px-4 py-1.5 rounded-full"
                style={
                  selected.status === 'used'
                    ? { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    : isExpired(selected)
                    ? { backgroundColor: '#fef2f2', color: '#ef4444' }
                    : { backgroundColor: '#f0fdf4', color: '#16a34a' }
                }
              >
                {selected.status === 'used'
                  ? 'Déjà utilisé'
                  : isExpired(selected)
                  ? 'Expiré'
                  : 'Valide — à présenter au restaurant'}
              </span>
              <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>
                Obtenu le {formatDate(selected.created_at)}
              </p>
              {selected.status === 'used' && selected.used_at && (
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                  Utilisé le {formatDate(selected.used_at)}
                </p>
              )}
              {selected.expires_at && (
                <p className="text-xs mt-0.5" style={{ color: isExpired(selected) ? '#ef4444' : '#f08816' }}>
                  {isExpired(selected) ? 'Expiré le' : 'Expire le'} {formatDate(selected.expires_at)}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
