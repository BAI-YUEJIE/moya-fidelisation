'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  name: string
  points: number
  birthday: string
  created_at: string
  redemption_count: number
}

type Tier = { label: string; min: number; max: number; next: number; color: string; bg: string; bar: string }

const medals = ['🥇', '🥈', '🥉']

function getTier(points: number): Tier {
  if (points >= 500) return { label: 'Gold', min: 500, max: Infinity, next: 500, color: 'text-yellow-700', bg: 'bg-yellow-100', bar: 'bg-yellow-400' }
  if (points >= 200) return { label: 'Silver', min: 200, max: 499, next: 500, color: 'text-gray-600', bg: 'bg-gray-100', bar: 'bg-gray-400' }
  return { label: 'Bronze', min: 0, max: 199, next: 200, color: 'text-orange-700', bg: 'bg-orange-100', bar: 'bg-orange-400' }
}

function isBirthdayToday(birthday: string): boolean {
  const today = new Date()
  const date = new Date(birthday)
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

function getMembershipDuration(created_at: string): string {
  const days = Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000)
  if (days >= 365) return `${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
  if (days >= 30) return `${Math.floor(days / 30)} mois`
  return `${days} j`
}

export default function LeaderboardPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, points, birthday, created_at')
        .order('points', { ascending: false })

      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select('user_id')
        .eq('type', 'redemption')

      if (profilesData) {
        const countMap: Record<string, number> = {}
        vouchersData?.forEach(v => {
          if (v.user_id) countMap[v.user_id] = (countMap[v.user_id] ?? 0) + 1
        })
        setMembers(profilesData.map(m => ({ ...m, redemption_count: countMap[m.id] ?? 0 })))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Classement</h1>
          <span className="text-sm text-gray-500">{members.length} membres</span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher un membre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        {/* Top 3 */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {top3.map((member, i) => {
              const tier = getTier(member.points)
              const birthday = isBirthdayToday(member.birthday)
              const progress = tier.label === 'Gold' ? 100 : Math.round(((member.points - tier.min) / (tier.next - tier.min)) * 100)
              return (
                <div key={member.id} className={`bg-white rounded-xl shadow p-4 flex flex-col items-center gap-2 ${i === 0 ? 'ring-2 ring-yellow-400' : ''}`}>
                  <span className="text-3xl">{medals[i]}</span>
                  <p className="font-semibold text-gray-900 text-sm text-center truncate w-full">
                    {member.name}{birthday ? ' 🎂' : ''}
                  </p>
                  <p className="text-lg font-bold text-gray-900">{member.points}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>{tier.label}</span>
                  {tier.label !== 'Gold' && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${tier.bar}`} style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rang</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Membre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Segment</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ancienneté</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Échanges</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rest.map((member, i) => {
                  const tier = getTier(member.points)
                  const birthday = isBirthdayToday(member.birthday)
                  const progress = tier.label === 'Gold' ? 100 : Math.round(((member.points - tier.min) / (tier.next - tier.min)) * 100)
                  return (
                    <tr key={member.id} className={birthday ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-3 text-gray-400 font-medium">#{i + 4}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {member.name}{birthday ? ' 🎂' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${tier.bg} ${tier.color}`}>{tier.label}</span>
                          {tier.label !== 'Gold' && (
                            <div className="w-16 bg-gray-100 rounded-full h-1">
                              <div className={`h-1 rounded-full ${tier.bar}`} style={{ width: `${progress}%` }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{getMembershipDuration(member.created_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{member.redemption_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{member.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucun membre trouvé.</p>
          </div>
        )}
      </div>
    </div>
  )
}
