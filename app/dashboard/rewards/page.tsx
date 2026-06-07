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
}

type Profile = {
  id: string
  points: number
}

export default function RewardsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: profileData }, { data: rewardsData }] = await Promise.all([
      supabase.from('profiles').select('id, points').eq('id', user.id).single(),
      supabase.from('rewards').select('id, name, points_cost, image_url').order('points_cost'),
    ])

    if (profileData) setProfile(profileData)
    if (rewardsData) setRewards(rewardsData)
  }

  async function handleRedeem(reward: Reward) {
    if (!profile) return
    setRedeeming(true)

    const supabase = createClient()
    const newPoints = profile.points - reward.points_cost

    await Promise.all([
      supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id),
      supabase.from('redemptions').insert({ user_id: profile.id, reward_id: reward.id }),
    ])

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
              const canRedeem = profile.points >= reward.points_cost
              return (
                <div key={reward.id} className="bg-white rounded-xl shadow overflow-hidden">
                  {reward.image_url ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={reward.image_url}
                        alt={reward.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">
                      🎁
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{reward.points_cost} points</p>
                    <button
                      onClick={() => setConfirmReward(reward)}
                      disabled={!canRedeem}
                      className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {canRedeem ? 'Échanger' : 'Points insuffisants'}
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
