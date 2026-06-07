'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Reward = {
  id: string
  name: string
  points_cost: number
  image_url: string | null
}

type ImageMode = 'url' | 'file'

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [imageMode, setImageMode] = useState<ImageMode>('url')
  const [form, setForm] = useState({ name: '', points_cost: '', image_url: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadRewards()
  }, [])

  async function loadRewards() {
    const supabase = createClient()
    const { data } = await supabase
      .from('rewards')
      .select('id, name, points_cost, image_url')
      .order('points_cost')
    if (data) setRewards(data)
    setLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    if (selected) {
      setPreview(URL.createObjectURL(selected))
    } else {
      setPreview(null)
    }
  }

  function closeModal() {
    setShowModal(false)
    setForm({ name: '', points_cost: '', image_url: '' })
    setFile(null)
    setPreview(null)
    setImageMode('url')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cost = parseInt(form.points_cost)
    if (!form.name || isNaN(cost) || cost <= 0) return

    setSaving(true)
    const supabase = createClient()
    let imageUrl: string | null = form.image_url || null

    if (imageMode === 'file' && file) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: uploaded } = await supabase.storage
        .from('rewards-images')
        .upload(path, file)

      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage
          .from('rewards-images')
          .getPublicUrl(uploaded.path)
        imageUrl = publicUrl
      }
    }

    await supabase.from('rewards').insert({
      name: form.name,
      points_cost: cost,
      image_url: imageUrl,
    })

    setSaving(false)
    closeModal()
    await loadRewards()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('rewards').delete().eq('id', id)
    await loadRewards()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Récompenses</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            + Ajouter
          </button>
        </div>

        {rewards.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-400">Aucune récompense pour l'instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <div key={reward.id} className="bg-white rounded-xl shadow overflow-hidden">
                {reward.image_url ? (
                  <div className="relative h-40 w-full">
                    <Image
                      src={reward.image_url}
                      alt={reward.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 flex items-center justify-center text-4xl text-gray-300">
                    🎁
                  </div>
                )}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{reward.name}</p>
                    <p className="text-sm text-gray-500">{reward.points_cost} points</p>
                  </div>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal ajout */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ajouter une récompense</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Nom</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Café offert"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Points requis</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ex: 100"
                  value={form.points_cost}
                  onChange={(e) => setForm({ ...form, points_cost: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Image</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setImageMode('url'); setFile(null); setPreview(null) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      imageMode === 'url'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageMode('file'); setForm({ ...form, image_url: '' }) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      imageMode === 'file'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Fichier local
                  </button>
                </div>

                {imageMode === 'url' ? (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    {preview ? (
                      <div className="relative h-32 w-full">
                        <Image src={preview} alt="preview" fill className="object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500">Cliquer pour choisir une image</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
