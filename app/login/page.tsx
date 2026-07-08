'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputStyle = {
  border: '1px solid #f0ebe4',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '14px',
  color: '#1c1917',
  outline: 'none',
  width: '100%',
  backgroundColor: '#ffffff',
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
      {/* Geometric background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <circle cx="350" cy="120" r="200" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="350" cy="120" r="140" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="350" cy="120" r="80" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="50" cy="700" r="180" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="50" cy="700" r="110" fill="none" stroke="white" strokeWidth="1"/>
        <line x1="0" y1="300" x2="400" y2="500" stroke="white" strokeWidth="0.5"/>
        <line x1="200" y1="0" x2="400" y2="400" stroke="white" strokeWidth="0.5"/>
      </svg>

      {/* Logo */}
      <div className="relative text-center mb-8">
        <h1 className="text-4xl font-bold tracking-[0.2em] text-white">MOYA</h1>
        <p className="text-xs font-semibold tracking-[0.3em] mt-1" style={{ color: '#f08816' }}>
          RESTAURANT JAPONAIS
        </p>
        <div className="mt-3 mx-auto w-8 h-px" style={{ backgroundColor: 'rgba(240,136,22,0.5)' }} />
      </div>

      {/* Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Connexion</h2>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Accédez à votre espace fidélité</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Email</label>
            <input id="email" name="email" type="email" required style={inputStyle} placeholder="vous@exemple.com" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Mot de passe</label>
              <Link href="/forgot-password" className="text-xs font-medium" style={{ color: '#f08816' }}>
                Oublié ?
              </Link>
            </div>
            <input id="password" name="password" type="password" required style={inputStyle} placeholder="••••••••" />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold mt-1 disabled:opacity-50"
            style={{ backgroundColor: '#f08816', color: '#ffffff' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: '#9ca3af' }}>
          Pas encore membre ?{' '}
          <Link href="/register" className="font-semibold" style={{ color: '#1c1917' }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
