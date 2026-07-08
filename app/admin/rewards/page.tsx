'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
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
  const [detailReward, setDetailReward] = useState<Reward | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'tous' | 'échange' | 'cadeau'>('tous')
  const [filterVisible, setFilterVisible] = useState<'tous' | 'visible' | 'masqué'>('tous')
  const [filterSort, setFilterSort] = useState<'points-asc' | 'points-desc' | 'nom'>('points-asc')
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      visible: form.type === 'cadeau' ? true : form.visible,
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

  const stats = useMemo(() => ({
    total: rewards.length,
    echange: rewards.filter(r => r.type === 'échange').length,
    cadeau: rewards.filter(r => r.type === 'cadeau').length,
  }), [rewards])

  const filteredRewards = useMemo(() => {
    let list = [...rewards]
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    if (filterType !== 'tous') list = list.filter(r => r.type === filterType)
    if (filterVisible === 'visible') list = list.filter(r => r.visible)
    if (filterVisible === 'masqué') list = list.filter(r => !r.visible)
    if (filterSort === 'points-asc') list.sort((a, b) => a.points_cost - b.points_cost)
    if (filterSort === 'points-desc') list.sort((a, b) => b.points_cost - a.points_cost)
    if (filterSort === 'nom') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [rewards, search, filterType, filterVisible, filterSort])

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('rewards').delete().eq('id', id)
    await loadRewards()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f3f0' }}>
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Hero header */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
          {/* Geometric background pattern */}
          <svg className="absolute right-0 top-0 opacity-5 pointer-events-none" width="280" height="200" viewBox="0 0 280 200">
            <circle cx="240" cy="40" r="120" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="240" cy="40" r="80" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="240" cy="40" r="40" fill="none" stroke="white" strokeWidth="1"/>
            <line x1="120" y1="0" x2="280" y2="160" stroke="white" strokeWidth="0.5"/>
            <line x1="160" y1="0" x2="280" y2="120" stroke="white" strokeWidth="0.5"/>
          </svg>

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#f08816' }}>Administration</p>
              <h1 className="text-2xl font-bold text-white">Récompenses</h1>
              {/* Inline stats */}
              <div className="flex gap-5 mt-4">
                <div>
                  <p className="text-xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Total</p>
                </div>
                <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <p className="text-xl font-bold" style={{ color: '#f08816' }}>{stats.echange}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Échanges</p>
                </div>
                <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <p className="text-xl font-bold" style={{ color: '#c084fc' }}>{stats.cadeau}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Cadeaux</p>
                </div>
              </div>
            </div>
            <button
              onClick={openAdd}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold mt-1"
              style={{ backgroundColor: '#f08816', color: '#ffffff' }}
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* Barre de recherche + filtres dropdown */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Recherche */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher une récompense..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            />
          </div>

          {/* Dropdowns */}
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as typeof filterType)}
              className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            >
              <option value="tous">Tous types</option>
              <option value="échange">Échange</option>
              <option value="cadeau">Cadeau</option>
            </select>

            <select
              value={filterVisible}
              onChange={e => setFilterVisible(e.target.value as typeof filterVisible)}
              disabled={filterType === 'cadeau'}
              className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none disabled:opacity-40"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            >
              <option value="tous">Visibilité</option>
              <option value="visible">Visible</option>
              <option value="masqué">Masqué</option>
            </select>

            <select
              value={filterSort}
              onChange={e => setFilterSort(e.target.value as typeof filterSort)}
              className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none"
              style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
            >
              <option value="points-asc">Points ↑</option>
              <option value="points-desc">Points ↓</option>
              <option value="nom">Nom A–Z</option>
            </select>
          </div>
        </div>

        {/* Grille */}
        {filteredRewards.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '1px solid #f0ebe4' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#fff7ed' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"/>
                <rect x="2" y="7" width="20" height="5"/>
                <line x1="12" y1="22" x2="12" y2="7"/>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">
              {rewards.length === 0 ? "Aucune récompense pour l'instant." : 'Aucun résultat.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRewards.map(reward => (
              <div
                key={reward.id}
                onClick={() => setDetailReward(reward)}
                className="bg-white rounded-2xl overflow-hidden cursor-pointer group"
                style={{ border: '1px solid #f0ebe4', transition: 'box-shadow 0.15s, transform 0.15s' }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = ''
                  e.currentTarget.style.transform = ''
                }}
              >
                {/* Image zone */}
                <div className="relative h-44 w-full">
                  {reward.image_url ? (
                    <>
                      <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
                      {/* gradient overlay */}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
                      {/* Background pattern */}
                      <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 200 176" preserveAspectRatio="xMidYMid slice">
                        <circle cx="160" cy="30" r="80" fill="none" stroke="white" strokeWidth="1"/>
                        <circle cx="160" cy="30" r="50" fill="none" stroke="white" strokeWidth="1"/>
                        <circle cx="40" cy="150" r="60" fill="none" stroke="white" strokeWidth="1"/>
                      </svg>
                      {/* Gift icon */}
                      <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(240,136,22,0.15)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 12 20 22 4 22 4 12"/>
                          <rect x="2" y="7" width="20" height="5"/>
                          <line x1="12" y1="22" x2="12" y2="7"/>
                          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Type badge — top right */}
                  <span
                    className="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={reward.type === 'cadeau'
                      ? { backgroundColor: 'rgba(192,132,252,0.9)', color: '#ffffff' }
                      : { backgroundColor: 'rgba(240,136,22,0.9)', color: '#ffffff' }
                    }
                  >
                    {reward.type === 'cadeau' ? 'Cadeau' : 'Échange'}
                  </span>

                  {/* Points badge — bottom left (échange only) */}
                  {reward.type === 'échange' && (
                    <span
                      className="absolute bottom-3 left-3 text-sm font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#1c1917' }}
                    >
                      {reward.points_cost} pts
                    </span>
                  )}

                  {/* Masqué overlay */}
                  {!reward.visible && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)' }}>
                        Masqué
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <p className="font-semibold text-gray-900 leading-tight">{reward.name}</p>
                  {reward.description && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: '#9ca3af' }}>{reward.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {reward.min_tier && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={
                          reward.min_tier === 'Gold'
                            ? { backgroundColor: 'rgba(184,134,11,0.1)', color: '#b8860b' }
                            : reward.min_tier === 'Silver'
                            ? { backgroundColor: 'rgba(107,114,128,0.1)', color: '#6b7280' }
                            : { backgroundColor: 'rgba(180,83,9,0.1)', color: '#b45309' }
                        }
                      >
                        {reward.min_tier}+
                      </span>
                    )}
                    {reward.stock !== null && (
                      <span className="text-xs" style={{ color: '#9ca3af' }}>Stock : {reward.stock}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ajout / modification ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Modifier la récompense' : 'Ajouter une récompense'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Type</label>
                <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#f5f3f0' }}>
                  {(['échange', 'cadeau'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                      style={form.type === t
                        ? { backgroundColor: '#ffffff', color: '#1c1917', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                        : { color: '#9ca3af' }
                      }
                    >
                      {t === 'échange' ? 'Échange' : 'Cadeau'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Nom</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Café offert"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                  Description <span className="normal-case font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Valable uniquement en salle"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                />
              </div>

              {/* Points */}
              {form.type === 'échange' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Points requis</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="ex: 100"
                    value={form.points_cost}
                    onChange={e => setForm({ ...form, points_cost: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                  />
                </div>
              )}

              {/* Image */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Image</label>
                <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#f5f3f0' }}>
                  <button
                    type="button"
                    onClick={() => { setImageMode('url'); setFile(null); setPreview(null) }}
                    className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={imageMode === 'url'
                      ? { backgroundColor: '#ffffff', color: '#1c1917', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                      : { color: '#9ca3af' }
                    }
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageMode('file'); setForm({ ...form, image_url: '' }) }}
                    className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={imageMode === 'file'
                      ? { backgroundColor: '#ffffff', color: '#1c1917', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                      : { color: '#9ca3af' }
                    }
                  >
                    Fichier local
                  </button>
                </div>

                {imageMode === 'url' ? (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.image_url}
                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                  />
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl p-6 text-center cursor-pointer"
                    style={{ border: '2px dashed #f0ebe4' }}
                  >
                    {preview ? (
                      <div className="relative h-32 w-full">
                        <Image src={preview} alt="preview" fill className="object-contain rounded-xl" />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm" style={{ color: '#6b7280' }}>Cliquer pour choisir une image</p>
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>JPG, PNG, WEBP</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                )}
              </div>

              {/* Champs échange uniquement */}
              {form.type === 'échange' && (
                <>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Visible pour les membres</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Désactiver pour masquer sans supprimer</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, visible: !form.visible })}
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{ backgroundColor: form.visible ? '#f08816' : '#e5e7eb' }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                        style={{ transform: form.visible ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                        Début <span className="normal-case font-normal">(opt.)</span>
                      </label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={e => setForm({ ...form, start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                        Fin <span className="normal-case font-normal">(opt.)</span>
                      </label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={e => setForm({ ...form, end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                        Max / membre <span className="normal-case font-normal">(opt.)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Illimité"
                        value={form.max_per_member}
                        onChange={e => setForm({ ...form, max_per_member: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                        Niveau min. <span className="normal-case font-normal">(opt.)</span>
                      </label>
                      <select
                        value={form.min_tier}
                        onChange={e => setForm({ ...form, min_tier: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
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

              {/* Stock */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                  Stock total <span className="normal-case font-normal">(optionnel)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Illimité"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid #f0ebe4', color: '#1c1917' }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                >
                  {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal détail récompense ── */}
      {detailReward && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDetailReward(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailReward(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#6b7280' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Image / placeholder */}
            <div className="relative h-48 w-full">
              {detailReward.image_url ? (
                <>
                  <Image src={detailReward.image_url} alt={detailReward.name} fill className="object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
                  <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 320 192" preserveAspectRatio="xMidYMid slice">
                    <circle cx="260" cy="40" r="100" fill="none" stroke="white" strokeWidth="1"/>
                    <circle cx="260" cy="40" r="60" fill="none" stroke="white" strokeWidth="1"/>
                    <circle cx="60" cy="170" r="80" fill="none" stroke="white" strokeWidth="1"/>
                  </svg>
                  <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(240,136,22,0.15)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 12 20 22 4 22 4 12"/>
                      <rect x="2" y="7" width="20" height="5"/>
                      <line x1="12" y1="22" x2="12" y2="7"/>
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                    </svg>
                  </div>
                </div>
              )}
              {/* Overlay badges on image */}
              <span
                className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={detailReward.type === 'cadeau'
                  ? { backgroundColor: 'rgba(192,132,252,0.9)', color: '#ffffff' }
                  : { backgroundColor: 'rgba(240,136,22,0.9)', color: '#ffffff' }
                }
              >
                {detailReward.type === 'cadeau' ? 'Cadeau' : 'Échange'}
              </span>
              {detailReward.type === 'échange' && (
                <span
                  className="absolute bottom-3 right-3 text-sm font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#1c1917' }}
                >
                  {detailReward.points_cost} pts
                </span>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{detailReward.name}</h2>
                {detailReward.description && (
                  <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>{detailReward.description}</p>
                )}
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f0ebe4' }}>
                {([
                  { label: 'Visible', value: detailReward.visible ? 'Oui' : 'Non' },
                  detailReward.stock !== null ? { label: 'Stock', value: String(detailReward.stock) } : null,
                  detailReward.max_per_member !== null ? { label: 'Max / membre', value: String(detailReward.max_per_member) } : null,
                  detailReward.min_tier ? { label: 'Niveau min.', value: detailReward.min_tier } : null,
                  detailReward.start_date ? { label: 'Disponible dès', value: detailReward.start_date.split('-').reverse().join('/') } : null,
                  detailReward.end_date ? { label: 'Expire le', value: detailReward.end_date.split('-').reverse().join('/') } : null,
                ] as Array<{ label: string; value: string } | null>)
                  .filter((row): row is { label: string; value: string } => row !== null)
                  .map((row, i, arr) => (
                    <div
                      key={i}
                      className="flex justify-between px-4 py-3"
                      style={i < arr.length - 1 ? { borderBottom: '1px solid #f0ebe4' } : {}}
                    >
                      <span className="text-sm" style={{ color: '#9ca3af' }}>{row.label}</span>
                      <span className="text-sm font-medium text-gray-900">{row.value}</span>
                    </div>
                  ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setDetailReward(null); openEdit(detailReward) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => { handleDelete(detailReward.id); setDetailReward(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
