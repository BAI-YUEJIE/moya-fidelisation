'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

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

      if (data) {
        setUserName(data.name)
        setIsAdmin(data.is_admin)
      }
    }
    load()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { label: 'Mon espace', href: '/dashboard' },
    { label: 'Récompenses', href: '/dashboard/rewards' },
    ...(isAdmin ? [{ label: 'Espace Admin', href: '/admin' }] : []),
  ]

  const bottomItems = [
    { label: 'Se déconnecter', onClick: handleLogout },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userName={userName} navItems={navItems} bottomItems={bottomItems} />
      <main className="lg:pl-56 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
