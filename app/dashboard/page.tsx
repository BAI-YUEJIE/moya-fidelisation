'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur votre espace</h1>
        <p className="text-gray-500 mt-2">Dashboard en cours de construction...</p>
        <button
          onClick={handleLogout}
          className="mt-6 bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
