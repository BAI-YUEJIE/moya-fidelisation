'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const today = new Date().toISOString().split('T')[0]

    const [{ data: profileData }, { data: rewardsData }, { data: vouchersData }] = await Promise.all([
      supabase.from('profiles').select('id, points').eq('id', user.id).single(),
      supabase.from('rewards')
        .select('id, name, points_cost, image_url, description, stock, max_per_member, min_tier')
        .eq('type', 'échange')
        .eq('visible', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('points_cost'),
      supabase.from('vouchers').select('reward_id').eq('user_id', user.id),
    ])

    if (profileData) setProfile(profileData)
    if (rewardsData) setRewards(rewardsData)
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

    // Vérifier le stock
    if (reward.stock !== null && reward.stock <= 0) {
      setRedeemError('Cette récompense n\'est plus disponible.')
      setRedeeming(false)
      return
    }

    // Vérifier max par membre
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
    await loadData()
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  const userTier = getUserTier(profile.points)

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Récompenses</h1>
          <span className="text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            {profile.points} points
          </span>
        </div>

        {rewards.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucune récompense disponible pour l'instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rewards.map((reward) => {
              const hasEnoughPoints = profile.points >= reward.points_cost
              const outOfStock = reward.stock !== null && reward.stock <= 0
              const tierLocked = reward.min_tier !== null &&
                tierOrder[userTier] < tierOrder[reward.min_tier]
              const userCount = redeemCounts[reward.id] ?? 0
              const maxReached = reward.max_per_member !== null && userCount >= reward.max_per_member
              const canRedeem = hasEnoughPoints && !outOfStock && !tierLocked && !maxReached

              return (
                <div key={reward.id} className={`bg-white rounded-xl shadow overflow-hidden ${(outOfStock || tierLocked) ? 'opacity-60' : ''}`}>
                  {reward.image_url ? (
                    <div className="relative h-40 w-full">
                      <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">🎁</div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{reward.points_cost} points</p>
                    {reward.description && (
                      <p className="text-xs text-gray-400 mt-1">{reward.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {reward.max_per_member !== null && (
                        <p className="text-xs text-gray-400">
                          {userCount}/{reward.max_per_member} échange{reward.max_per_member > 1 ? 's' : ''} utilisé{userCount > 1 ? 's' : ''}
                        </p>
                      )}
                      {reward.stock !== null && reward.stock > 0 && (
                        <p className="text-xs text-orange-500">
                          {reward.stock} restant{reward.stock > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openConfirm(reward)}
                      disabled={!canRedeem}
                      className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {outOfStock
                        ? 'Plus disponible'
                        : tierLocked
                        ? `Niveau ${reward.min_tier} requis`
                        : maxReached
                        ? 'Limite atteinte'
                        : hasEnoughPoints
                        ? 'Échanger'
                        : 'Points insuffisants'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {confirmReward && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Confirmer l'échange</h2>
              <p className="text-sm text-gray-600 mt-1">
                Échanger <span className="font-medium">{confirmReward.points_cost} points</span> contre{' '}
                <span className="font-medium">{confirmReward.name}</span> ?
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Solde après échange : {profile.points - confirmReward.points_cost} points
              </p>
              {redeemError && (
                <p className="text-xs text-red-500 mt-2">{redeemError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReward(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleRedeem(confirmReward)}
                disabled={redeeming}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {redeeming ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
