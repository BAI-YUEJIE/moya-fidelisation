'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  name: string
  email: string
  birthday: string
  points: number
  created_at: string
}

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
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMembers() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/dashboard')
        return
      }

      const { data } = await supabase
        .from('members_view')
        .select('id, name, email, birthday, points, created_at')
        .order('created_at', { ascending: false })

      if (data) setMembers(data)
      setLoading(false)
    }

    loadMembers()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Espace Admin</h1>
          </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const birthday = isBirthdayToday(member.birthday)
                return (
                  <tr
                    key={member.id}
                    className={birthday ? 'bg-yellow-50' : ''}
                  >
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
                    <td className="px-4 py-3 text-gray-600">{member.points}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(member.created_at)}</td>
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
    </div>
  )
}
