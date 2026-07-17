'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '../user-context'

type ProfileData = {
  name: string
  birthday: string | null
  points: number
  created_at: string
  email: string
}

function getTier(points: number) {
  if (points >= 500) return { label: 'Gold', color: '#b8860b', next: null, min: 500, max: 500 }
  if (points >= 200) return { label: 'Silver', color: '#6b7280', next: 500, min: 200, max: 500 }
  return { label: 'Bronze', color: '#b45309', next: 200, min: 0, max: 200 }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('T')[0].split('-')
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

const inputStyle = {
  border: '1px solid #f0ebe4',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  color: '#1c1917',
  backgroundColor: '#ffffff',
  width: '100%',
}

export default function ProfilePage() {
  const router = useRouter()
  const { setUserName } = useUser()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [form, setForm] = useState({ name: '', birthday: '' })
  const [editingInfo, setEditingInfo] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ next: '', confirm: '' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('name, birthday, points, created_at')
        .eq('id', user.id)
        .single()

      if (data) {
        const p = { ...data, email: user.email ?? '' }
        setProfile(p)
        setForm({ name: data.name, birthday: data.birthday ?? '' })
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSaveInfo(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!userId) return
    setSavingInfo(true)
    setInfoError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ name: form.name, birthday: form.birthday })
      .eq('id', userId)

    if (error) {
      setInfoError('Une erreur est survenue.')
    } else {
      setProfile(prev => prev ? { ...prev, name: form.name, birthday: form.birthday } : prev)
      setUserName(form.name)
      setEditingInfo(false)
    }
    setSavingInfo(false)
  }

  async function handleSavePassword(e: { preventDefault(): void }) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    if (passwordForm.next.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })

    if (error) {
      setPasswordError('Erreur : ' + error.message)
    } else {
      setPasswordSuccess(true)
      setPasswordForm({ next: '', confirm: '' })
      setEditingPassword(false)
    }
    setSavingPassword(false)
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  const tier = getTier(profile.points)
  const progress = tier.next
    ? Math.round(((profile.points - tier.min) / (tier.max - tier.min)) * 100)
    : 100

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* Avatar + nom + niveau */}
        <div className="pt-2 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
            style={{ backgroundColor: 'rgba(240,136,22,0.12)', color: '#f08816' }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{profile.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: tier.color }}
              >
                {tier.label}
              </span>
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                {profile.points} pts
              </span>
            </div>
            {tier.next && (
              <div className="mt-2">
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#f0ebe4' }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${progress}%`, backgroundColor: '#f08816' }}
                  />
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                  encore {tier.next - profile.points} pts pour {tier.label === 'Bronze' ? 'Silver' : 'Gold'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mon compte */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f5f3f0' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Mon compte</p>
          </div>
          <div>
            {[
              { label: 'Email', value: profile.email },
              { label: 'Membre depuis', value: formatDate(profile.created_at) },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3.5"
                style={i === 0 ? { borderBottom: '1px solid #f5f3f0' } : {}}
              >
                <span className="text-sm" style={{ color: '#9ca3af' }}>{row.label}</span>
                <span className="text-sm font-medium text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid #f5f3f0' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Informations personnelles</p>
            {!editingInfo && (
              <button
                onClick={() => setEditingInfo(true)}
                className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
              >
                Modifier
              </button>
            )}
          </div>

          {editingInfo ? (
            <form onSubmit={handleSaveInfo} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="info-name" className="text-xs font-medium" style={{ color: '#6b7280' }}>Nom complet</label>
                <input
                  id="info-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="info-birthday" className="text-xs font-medium" style={{ color: '#6b7280' }}>Date de naissance</label>
                <input
                  id="info-birthday"
                  type="date"
                  required
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  style={inputStyle}
                />
              </div>
              {infoError && (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>{infoError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setEditingInfo(false); setForm({ name: profile.name, birthday: profile.birthday ?? '' }); setInfoError(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                >
                  {savingInfo ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {[
                { label: 'Nom complet', value: profile.name },
                { label: 'Date de naissance', value: formatDate(profile.birthday) },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={i === 0 ? { borderBottom: '1px solid #f5f3f0' } : {}}
                >
                  <span className="text-sm" style={{ color: '#9ca3af' }}>{row.label}</span>
                  <span className="text-sm font-medium text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mot de passe */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid #f5f3f0' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Mot de passe</p>
            {!editingPassword && (
              <button
                onClick={() => setEditingPassword(true)}
                className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
              >
                Modifier
              </button>
            )}
          </div>

          {editingPassword ? (
            <form onSubmit={handleSavePassword} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pwd-next" className="text-xs font-medium" style={{ color: '#6b7280' }}>Nouveau mot de passe</label>
                <input
                  id="pwd-next"
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pwd-confirm" className="text-xs font-medium" style={{ color: '#6b7280' }}>Confirmer le mot de passe</label>
                <input
                  id="pwd-confirm"
                  type="password"
                  required
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  style={inputStyle}
                />
              </div>
              {passwordError && (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>Mot de passe mis à jour.</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setEditingPassword(false); setPasswordForm({ next: '', confirm: '' }); setPasswordError(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                >
                  {savingPassword ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          ) : (
            <div className="px-5 py-3.5">
              <p className="text-sm tracking-widest" style={{ color: '#d1d5db' }}>••••••••</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
