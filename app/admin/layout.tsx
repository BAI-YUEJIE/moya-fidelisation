'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('name, is_admin')
        .eq('id', user.id)
        .single()

      if (!data?.is_admin) { router.push('/dashboard'); return }
      setUserName(data.name)
    }
    load()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { label: 'Membres', href: '/admin' },
    { label: 'Récompenses', href: '/admin/rewards' },
    { label: 'Codes cadeaux', href: '/admin/vouchers' },
    { label: 'Scanner', href: '/admin/scan' },
    { label: 'Classement', href: '/admin/leaderboard' },
  ]

  const bottomItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Se déconnecter', onClick: handleLogout },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#f5f3f0' }}>
      <Sidebar userName={userName} navItems={navItems} bottomItems={bottomItems} />
      <main className="lg:pl-56 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
