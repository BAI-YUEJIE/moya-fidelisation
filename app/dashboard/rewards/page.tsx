'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Reward = {
  id: string
  name: string
  points_cost: number
  image_url: string | null
  description: string | null
  stock: number | null
  max_per_member: number | null
  min_tier: string | null
}

type Profile = {
  id: string
  points: number
}

type RedeemCount = Record<string, number>

const tierOrder: Record<string, number> = { Bronze: 0, Silver: 1, Gold: 2 }

function getUserTier(points: number): string {
  if (points >= 500) return 'Gold'
  if (points >= 200) return 'Silver'
  return 'Bronze'
}

export default function RewardsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redeemCounts, setRedeemCounts] = useState<RedeemCount>({})
  const [voucherCount, setVoucherCount] = useState(0)
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [onlyRedeemable, setOnlyRedeemable] = useState(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const today = new Date().toISOString().split('T')[0]

    const [{ data: profileData }, { data: rewardsData }, { data: vouchersData }, { count: unusedCount }] = await Promise.all([
      supabase.from('profiles').select('id, points').eq('id', user.id).single(),
      supabase.from('rewards')
        .select('id, name, points_cost, image_url, description, stock, max_per_member, min_tier')
        .eq('type', 'échange')
        .eq('visible', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('points_cost'),
      supabase.from('vouchers').select('reward_id').eq('user_id', user.id),
      supabase.from('vouchers').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'unused'),
    ])

    if (profileData) setProfile(profileData)
    if (rewardsData) setRewards(rewardsData)
    if (unusedCount !== null) setVoucherCount(unusedCount)
    if (vouchersData) {
      const counts: RedeemCount = {}
      for (const v of vouchersData) {
        if (v.reward_id) counts[v.reward_id] = (counts[v.reward_id] ?? 0) + 1
      }
      setRedeemCounts(counts)
    }
  }

  function openConfirm(reward: Reward) {
    setRedeemError(null)
    setConfirmReward(reward)
  }

  async function handleRedeem(reward: Reward) {
    if (!profile) return
    setRedeeming(true)
    setRedeemError(null)

    const supabase = createClient()

    if (reward.stock !== null && reward.stock <= 0) {
      setRedeemError('Cette récompense n\'est plus disponible.')
      setRedeeming(false)
      return
    }

    if (reward.max_per_member !== null) {
      const { count } = await supabase
        .from('vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('reward_id', reward.id)

      if (count !== null && count >= reward.max_per_member) {
        setRedeemError(`Vous avez déjà échangé cette récompense ${reward.max_per_member} fois.`)
        setRedeeming(false)
        return
      }
    }

    const newPoints = profile.points - reward.points_cost
    const updates: Promise<unknown>[] = [
      supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id),
      supabase.from('vouchers').insert({ user_id: profile.id, reward_id: reward.id, type: 'redemption' }),
      supabase.from('points_history').insert({ user_id: profile.id, amount: -reward.points_cost, reason: 'échange', description: reward.name }),
    ]

    if (reward.stock !== null) {
      updates.push(supabase.from('rewards').update({ stock: reward.stock - 1 }).eq('id', reward.id))
    }

    await Promise.all(updates)

    setConfirmReward(null)
    setRedeeming(false)
    setToast(`"${reward.name}" ajouté à vos bons !`)
    await loadData()
  }

  const userTier = getUserTier(profile?.points ?? 0)

  // Prochaine récompense la plus proche (non accessible mais pas bloquée par tier/stock/max)
  const nextReachable = useMemo(() => {
    if (!profile) return null
    return rewards
      .filter(r => {
        const outOfStock = r.stock !== null && r.stock <= 0
        const tierLocked = r.min_tier !== null && tierOrder[userTier] < tierOrder[r.min_tier]
        const userCount = redeemCounts[r.id] ?? 0
        const maxReached = r.max_per_member !== null && userCount >= r.max_per_member
        return r.points_cost > profile.points && !outOfStock && !tierLocked && !maxReached
      })
      .sort((a, b) => a.points_cost - b.points_cost)[0] ?? null
  }, [rewards, profile, userTier, redeemCounts])

  // Filtrage + tri
  const filteredRewards = useMemo(() => {
    if (!profile) return []
    let list = rewards.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase())
    )
    if (onlyRedeemable) {
      list = list.filter(r => {
        const outOfStock = r.stock !== null && r.stock <= 0
        const tierLocked = r.min_tier !== null && tierOrder[userTier] < tierOrder[r.min_tier]
        const userCount = redeemCounts[r.id] ?? 0
        const maxReached = r.max_per_member !== null && userCount >= r.max_per_member
        return profile.points >= r.points_cost && !outOfStock && !tierLocked && !maxReached
      })
    }
    return [...list].sort((a, b) =>
      sortOrder === 'asc' ? a.points_cost - b.points_cost : b.points_cost - a.points_cost
    )
  }, [rewards, search, onlyRedeemable, sortOrder, profile, userTier, redeemCounts])

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Catalogue</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Récompenses</h1>
          </div>
          <div className="flex items-center gap-2">
            {voucherCount > 0 && (
              <Link
                href="/dashboard/vouchers"
                className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
                style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
                  <line x1="12" y1="22" x2="12" y2="7"/>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
                {voucherCount} bon{voucherCount > 1 ? 's' : ''}
              </Link>
            )}
            <Link
              href="/dashboard/history"
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#1c1917', color: '#f08816' }}
            >
              {profile.points} pts
            </Link>
          </div>
        </div>

        {/* Bannière prochaine récompense */}
        {nextReachable && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
          >
            <div>
              <p className="text-xs font-medium" style={{ color: '#9a3412' }}>Prochaine récompense accessible</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{nextReachable.name}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-lg font-bold" style={{ color: '#f08816' }}>
                +{nextReachable.points_cost - profile.points}
              </p>
              <p className="text-xs" style={{ color: '#9ca3af' }}>pts manquants</p>
            </div>
          </div>
        )}

        {/* Barre de recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher une récompense…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white shadow-sm outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2.5 rounded-xl text-sm bg-white shadow-sm outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            >
              <option value="asc">Prix croissant</option>
              <option value="desc">Prix décroissant</option>
            </select>
            <button
              onClick={() => setOnlyRedeemable(v => !v)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
              style={onlyRedeemable
                ? { backgroundColor: '#f08816', color: '#ffffff' }
                : { backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid #f0ebe4' }
              }
            >
              Accessibles
            </button>
          </div>
        </div>

        {/* Liste */}
        {filteredRewards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {rewards.length === 0 ? "Aucune récompense disponible pour l'instant." : 'Aucun résultat.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRewards.map((reward) => {
              const hasEnoughPoints = profile.points >= reward.points_cost
              const outOfStock = reward.stock !== null && reward.stock <= 0
              const tierLocked = reward.min_tier !== null &&
                tierOrder[userTier] < tierOrder[reward.min_tier]
              const userCount = redeemCounts[reward.id] ?? 0
              const maxReached = reward.max_per_member !== null && userCount >= reward.max_per_member
              const canRedeem = hasEnoughPoints && !outOfStock && !tierLocked && !maxReached
              const unavailable = outOfStock || tierLocked || maxReached
              const missing = !hasEnoughPoints ? reward.points_cost - profile.points : 0

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
                  style={{ opacity: unavailable ? 0.6 : 1 }}
                >
                  {reward.image_url ? (
                    <div className="relative h-44 w-full">
                      <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div
                      className="h-44 flex items-center justify-center relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }}
                    >
                      <div
                        className="absolute inset-0 opacity-5"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.5'%3E%3Ccircle cx='20' cy='20' r='15'/%3E%3Ccircle cx='0' cy='0' r='15'/%3E%3Ccircle cx='40' cy='0' r='15'/%3E%3Ccircle cx='0' cy='40' r='15'/%3E%3Ccircle cx='40' cy='40' r='15'/%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                      />
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 12 20 22 4 22 4 12"/>
                        <rect x="2" y="7" width="20" height="5"/>
                        <line x1="12" y1="22" x2="12" y2="7"/>
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                      </svg>
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 leading-snug">{reward.name}</h3>
                      <span
                        className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg mt-0.5"
                        style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
                      >
                        {reward.points_cost} pts
                      </span>
                    </div>

                    {reward.description && (
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#9ca3af' }}>
                        {reward.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                      {reward.max_per_member !== null && (
                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                          {userCount}/{reward.max_per_member} utilisé{userCount > 1 ? 's' : ''}
                        </p>
                      )}
                      {reward.stock !== null && reward.stock > 0 && (
                        <p className="text-xs font-medium" style={{ color: '#f08816' }}>
                          {reward.stock} restant{reward.stock > 1 ? 's' : ''}
                        </p>
                      )}
                      {reward.min_tier && (
                        <p className="text-xs" style={{ color: '#9ca3af' }}>
                          Niveau {reward.min_tier} requis
                        </p>
                      )}
                      {missing > 0 && !unavailable && (
                        <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                          encore {missing} pts
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => openConfirm(reward)}
                      disabled={!canRedeem}
                      className="mt-auto pt-3 w-full py-2.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed"
                      style={canRedeem
                        ? { backgroundColor: '#f08816', color: '#ffffff' }
                        : { backgroundColor: '#f5f3f0', color: '#9ca3af' }
                      }
                    >
                      {outOfStock ? 'Plus disponible'
                        : tierLocked ? `Niveau ${reward.min_tier} requis`
                        : maxReached ? 'Limite atteinte'
                        : !hasEnoughPoints ? `Il manque ${missing} pts`
                        : 'Échanger'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal confirmation */}
      {confirmReward && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setConfirmReward(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#9ca3af' }}>Confirmer l'échange</p>
              <h2 className="text-lg font-bold text-gray-900">{confirmReward.name}</h2>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                Coût : <span className="font-semibold" style={{ color: '#f08816' }}>{confirmReward.points_cost} points</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                Solde après échange : {profile.points - confirmReward.points_cost} pts
              </p>
              {redeemError && (
                <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{redeemError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReward(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleRedeem(confirmReward)}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#f08816', color: '#ffffff' }}
              >
                {redeeming ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast succès */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white"
          style={{ backgroundColor: '#1c1917', whiteSpace: 'nowrap' }}
        >
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
