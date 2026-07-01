'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Reward = {
  id: string
  name: string
  points_cost: number
  image_url: string | null
  type: 'échange' | 'cadeau'
  visible: boolean
  start_date: string | null
  end_date: string | null
  max_per_member: number | null
  stock: number | null
  description: string | null
  min_tier: string | null
}

type ImageMode = 'url' | 'file'

const emptyForm = {
  name: '',
  points_cost: '',
  image_url: '',
  type: 'échange' as 'échange' | 'cadeau',
  visible: true,
  start_date: '',
  end_date: '',
  max_per_member: '',
  stock: '',
  description: '',
  min_tier: '',
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageMode, setImageMode] = useState<ImageMode>('url')
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadRewards() }, [])

  async function loadRewards() {
    const supabase = createClient()
    const { data } = await supabase
      .from('rewards')
      .select('id, name, points_cost, image_url, type, visible, start_date, end_date, max_per_member, stock, description, min_tier')
      .order('points_cost')
    if (data) setRewards(data)
    setLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setPreview(selected ? URL.createObjectURL(selected) : null)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setFile(null)
    setPreview(null)
    setImageMode('url')
    setShowModal(true)
  }

  function openEdit(reward: Reward) {
    setEditingId(reward.id)
    setForm({
      name: reward.name,
      points_cost: reward.points_cost.toString(),
      image_url: reward.image_url ?? '',
      type: reward.type,
      visible: reward.visible,
      start_date: reward.start_date ?? '',
      end_date: reward.end_date ?? '',
      max_per_member: reward.max_per_member?.toString() ?? '',
      stock: reward.stock?.toString() ?? '',
      description: reward.description ?? '',
      min_tier: reward.min_tier ?? '',
    })
    setFile(null)
    setPreview(reward.image_url ?? null)
    setImageMode('url')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setFile(null)
    setPreview(null)
    setImageMode('url')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cost = form.type === 'cadeau' ? 0 : parseInt(form.points_cost)
    if (!form.name || (form.type === 'échange' && (isNaN(cost) || cost <= 0))) return

    setSaving(true)
    const supabase = createClient()
    let imageUrl: string | null = form.image_url || null

    if (imageMode === 'file' && file) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: uploaded } = await supabase.storage.from('rewards-images').upload(path, file)
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('rewards-images').getPublicUrl(uploaded.path)
        imageUrl = publicUrl
      }
    }

    const payload = {
      name: form.name,
      points_cost: cost,
      image_url: imageUrl,
      type: form.type,
      visible: form.visible,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      max_per_member: form.max_per_member ? parseInt(form.max_per_member) : null,
      stock: form.stock ? parseInt(form.stock) : null,
      description: form.description || null,
      min_tier: form.min_tier || null,
    }

    if (editingId) {
      await supabase.from('rewards').update(payload).eq('id', editingId)
    } else {
      await supabase.from('rewards').insert(payload)
    }

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
            onClick={openAdd}
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
              <div key={reward.id} className={`bg-white rounded-xl shadow overflow-hidden ${!reward.visible ? 'opacity-60' : ''}`}>
                {reward.image_url ? (
                  <div className="relative h-40 w-full">
                    <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 flex items-center justify-center text-4xl text-gray-300">🎁</div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-gray-900 leading-tight">{reward.name}</p>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        reward.type === 'cadeau' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {reward.type === 'cadeau' ? 'Cadeau' : 'Échange'}
                      </span>
                      {!reward.visible && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Masqué</span>
                      )}
                    </div>
                  </div>

                  {reward.type === 'échange' && (
                    <p className="text-sm text-gray-500">{reward.points_cost} points</p>
                  )}
                  {reward.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{reward.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {reward.stock !== null && (
                      <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        Stock : {reward.stock}
                      </span>
                    )}
                    {reward.min_tier && (
                      <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        ≥ {reward.min_tier}
                      </span>
                    )}
                    {reward.max_per_member && (
                      <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        Max {reward.max_per_member}/membre
                      </span>
                    )}
                    {reward.end_date && (
                      <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        Jusqu'au {new Date(reward.end_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openEdit(reward)}
                      className="flex-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(reward.id)}
                      className="flex-1 text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded border border-red-100 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Modifier la récompense' : 'Ajouter une récompense'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Type */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <div className="flex gap-2">
                  {(['échange', 'cadeau'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.type === t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t === 'échange' ? 'Échange' : 'Cadeau'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom */}
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

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Description <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Valable uniquement en salle"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Points — échange uniquement */}
              {form.type === 'échange' && (
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
              )}

              {/* Image */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Image</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setImageMode('url'); setFile(null); setPreview(null) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      imageMode === 'url' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageMode('file'); setForm({ ...form, image_url: '' }) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      imageMode === 'file' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                )}
              </div>

              {/* Champs réservés au type échange */}
              {form.type === 'échange' && (
                <>
                  {/* Visible */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Visible pour les membres</p>
                      <p className="text-xs text-gray-400">Désactiver pour masquer sans supprimer</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, visible: !form.visible })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.visible ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.visible ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Date de début <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Date de fin <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>

                  {/* Max par membre & niveau minimum */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Max par membre <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Illimité"
                        value={form.max_per_member}
                        onChange={(e) => setForm({ ...form, max_per_member: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Niveau minimum <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <select
                        value={form.min_tier}
                        onChange={(e) => setForm({ ...form, min_tier: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="">Tous</option>
                        <option value="Bronze">Bronze et +</option>
                        <option value="Silver">Silver et +</option>
                        <option value="Gold">Gold uniquement</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Stock — commun aux deux types */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Stock total <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Illimité"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Boutons */}
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
                  {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
