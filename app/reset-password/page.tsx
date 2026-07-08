'use client'

import { useEffect, useState } from 'react'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        router.push('/login')
      }
    })
  }, [router])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: form.password })

    if (error) {
      setError('Erreur : ' + error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Vérification...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
      {/* Geometric background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <circle cx="350" cy="120" r="200" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="350" cy="120" r="140" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="350" cy="120" r="80" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="50" cy="700" r="180" fill="none" stroke="white" strokeWidth="1"/>
        <line x1="0" y1="300" x2="400" y2="500" stroke="white" strokeWidth="0.5"/>
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

        {success ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mot de passe mis à jour !</h2>
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>Redirection vers votre espace...</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Nouveau mot de passe</h2>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Choisissez un mot de passe sécurisé.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pwd" className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Nouveau mot de passe</label>
                <input
                  id="pwd"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={inputStyle}
                  placeholder="6 caractères minimum"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="pwd-confirm" className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Confirmer</label>
                <input
                  id="pwd-confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>

              {/* Indicateur de correspondance */}
              {form.confirm.length > 0 && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: form.password === form.confirm ? '#16a34a' : '#ef4444' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    {form.password === form.confirm
                      ? <polyline points="20 6 9 17 4 12"/>
                      : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                    }
                  </svg>
                  {form.password === form.confirm ? 'Les mots de passe correspondent' : 'Ne correspondent pas'}
                </p>
              )}

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
                {loading ? 'Enregistrement...' : 'Mettre à jour'}
              </button>
            </form>

            <p className="text-sm text-center mt-6">
              <Link href="/login" className="font-semibold" style={{ color: '#9ca3af' }}>
                ← Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
