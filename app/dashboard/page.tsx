'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QRCodeDisplay from '@/components/QRCodeDisplay'

type Profile = {
  name: string
  points: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('name, points')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
    }

    loadUser()
  }, [router])

  if (!userId || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow w-full max-w-sm p-8 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {profile.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{profile.points} points</p>
        </div>

        <QRCodeDisplay userId={userId} />
      </div>
    </div>
  )
}
