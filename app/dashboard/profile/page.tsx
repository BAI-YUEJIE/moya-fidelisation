'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '../user-context'

type ProfileData = {
  name: string
  birthday: string
  points: number
  created_at: string
  email: string
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
  const [infoSuccess, setInfoSuccess] = useState(false)
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
        setForm({ name: data.name, birthday: data.birthday })
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
    setInfoSuccess(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ name: form.name, birthday: form.birthday })
      .eq('id', userId)

    if (error) {
      setInfoError('Une erreur est survenue.')
    } else {
      setInfoSuccess(true)
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
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

        {/* Infos non modifiables */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Mon compte</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm text-gray-900">{profile.email}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Points</span>
              <span className="text-sm font-semibold text-gray-900">{profile.points} pts</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Membre depuis</span>
              <span className="text-sm text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Infos modifiables */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>
            {!editingInfo && (
              <button
                onClick={() => setEditingInfo(true)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline"
              >
                Modifier
              </button>
            )}
          </div>

          {editingInfo ? (
            <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="info-name" className="text-sm font-medium text-gray-700">Nom complet</label>
                <input
                  id="info-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="info-birthday" className="text-sm font-medium text-gray-700">Date de naissance</label>
                <input
                  id="info-birthday"
                  type="date"
                  required
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {infoError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{infoError}</p>
              )}
              {infoSuccess && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Informations mises à jour.</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setEditingInfo(false); setForm({ name: profile.name, birthday: profile.birthday }); setInfoError(null) }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingInfo ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Nom complet</span>
                <span className="text-sm text-gray-900">{profile.name}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Date de naissance</span>
                <span className="text-sm text-gray-900">
                  {new Date(profile.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Mot de passe */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Mot de passe</h2>
            {!editingPassword && (
              <button
                onClick={() => setEditingPassword(true)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline"
              >
                Modifier
              </button>
            )}
          </div>

          {editingPassword ? (
            <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="pwd-next" className="text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                <input
                  id="pwd-next"
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pwd-confirm" className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                <input
                  id="pwd-confirm"
                  type="password"
                  required
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Mot de passe mis à jour.</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setEditingPassword(false); setPasswordForm({ next: '', confirm: '' }); setPasswordError(null) }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingPassword ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-400 tracking-widest">••••••••</p>
          )}
        </div>
      </div>
    </div>
  )
}
