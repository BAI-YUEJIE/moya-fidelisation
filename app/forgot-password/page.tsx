'use client'

import { useState } from 'react'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError("Une erreur est survenue. Vérifiez l'adresse email.")
    } else {
      setSent(true)
    }
    setLoading(false)
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

        {sent ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Email envoyé !</h2>
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
                Un lien de réinitialisation a été envoyé à{' '}
                <span className="font-semibold text-gray-900">{email}</span>.
                Vérifiez votre boîte mail.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl text-sm font-semibold text-center mt-2"
              style={{ backgroundColor: '#f5f3f0', color: '#1c1917' }}
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Mot de passe oublié</h2>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="vous@exemple.com"
                />
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
                {loading ? 'Envoi...' : 'Envoyer le lien'}
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
