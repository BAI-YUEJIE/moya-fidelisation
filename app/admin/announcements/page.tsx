'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Cropper from 'react-easy-crop'
import { createClient } from '@/lib/supabase/client'

type Announcement = {
  id: string
  title: string
  body: string | null
  image_url: string | null
  active: boolean
  pinned: boolean
  publish_at: string | null
  expires_at: string | null
  restaurant: string | null
  created_at: string
}

type CropArea = { x: number; y: number; width: number; height: number }
type FilterStatus = 'tous' | 'actives' | 'inactives' | 'programmees' | 'expirees'

const RESTAURANTS = [
  { key: null, label: 'Tous les restaurants' },
  { key: 'plaisance', label: 'Plaisance-du-Touch' },
  { key: 'montauban', label: 'Montauban' },
  { key: 'clermont', label: 'Clermont-Ferrand' },
]

function restaurantLabel(key: string | null) {
  return RESTAURANTS.find(r => r.key === key)?.label ?? 'Tous les restaurants'
}

function isExpired(a: Announcement) {
  return a.active && a.expires_at !== null && new Date(a.expires_at) <= new Date()
}

function isScheduled(a: Announcement) {
  return a.active && !isExpired(a) && a.publish_at !== null && new Date(a.publish_at) > new Date()
}

function isLive(a: Announcement) {
  return a.active && !isExpired(a) && (a.publish_at === null || new Date(a.publish_at) <= new Date())
}

async function getCroppedBlob(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise(resolve => { image.onload = resolve })
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92))
}

const emptyForm = { title: '', body: '', restaurant: '', publish_at: '', expires_at: '' }

// Composant prévisualisation côté membre
function PreviewCard({ title, body, imageUrl }: { title: string; body: string; imageUrl: string | null }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      {imageUrl && <img src={imageUrl} alt={title} className="w-full object-cover" style={{ aspectRatio: '16/9' }} />}
      <div className="p-4">
        <p className="font-semibold text-sm mb-2" style={{ color: '#1c1917' }}>{title || '(sans titre)'}</p>
        {body && (
          expanded ? (
            <>
              <p className="text-sm leading-relaxed mb-2" style={{ color: '#6b7280' }}>{body}</p>
              <button onClick={() => setExpanded(false)} className="text-xs font-semibold" style={{ color: '#9ca3af' }}>
                Réduire ↑
              </button>
            </>
          ) : (
            <button onClick={() => setExpanded(true)} className="text-xs font-semibold" style={{ color: '#f08816' }}>
              En savoir plus →
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('tous')
  const [filterRestaurant, setFilterRestaurant] = useState<string>('tous')
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Image crop
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    const supabase = createClient()
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, image_url, active, pinned, publish_at, expires_at, restaurant, created_at')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const stats = useMemo(() => ({
    total: announcements.length,
    actives: announcements.filter(isLive).length,
    programmees: announcements.filter(isScheduled).length,
    expirees: announcements.filter(isExpired).length,
    inactives: announcements.filter(a => !a.active).length,
  }), [announcements])

  const filtered = useMemo(() => announcements.filter(a => {
    if (filterStatus === 'actives' && !isLive(a)) return false
    if (filterStatus === 'inactives' && a.active) return false
    if (filterStatus === 'programmees' && !isScheduled(a)) return false
    if (filterStatus === 'expirees' && !isExpired(a)) return false
    if (filterRestaurant !== 'tous' && a.restaurant !== (filterRestaurant === 'global' ? null : filterRestaurant)) return false
    return true
  }), [announcements, filterStatus, filterRestaurant])

  async function toggleActive(a: Announcement) {
    const supabase = createClient()
    await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id)
    showToast(a.active ? 'Annonce désactivée' : 'Annonce publiée')
    loadData()
  }

  async function togglePinned(a: Announcement) {
    const supabase = createClient()
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id)
    showToast(a.pinned ? 'Épingle retirée' : 'Annonce épinglée')
    loadData()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    setDeleteId(null)
    showToast('Annonce supprimée')
    loadData()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRawImageSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setShowCropModal(true)
  }

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function confirmCrop() {
    if (!rawImageSrc || !croppedAreaPixels) return
    const blob = await getCroppedBlob(rawImageSrc, croppedAreaPixels)
    setCroppedPreview(URL.createObjectURL(blob))
    setShowCropModal(false)
  }

  function resetImage() {
    setRawImageSrc(null)
    setCroppedPreview(null)
    setCroppedAreaPixels(null)
  }

  function openCreate() {
    setEditingId(null)
    setEditingImageUrl(null)
    setForm(emptyForm)
    resetImage()
    setShowPreview(false)
    setShowModal(true)
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id)
    setEditingImageUrl(a.image_url)
    setForm({
      title: a.title,
      body: a.body ?? '',
      restaurant: a.restaurant ?? '',
      publish_at: a.publish_at ? new Date(a.publish_at).toISOString().slice(0, 16) : '',
      expires_at: a.expires_at ? new Date(a.expires_at).toISOString().slice(0, 16) : '',
    })
    resetImage()
    setShowPreview(false)
    setShowModal(true)
  }

  function closeMainModal() {
    setShowModal(false)
    setShowPreview(false)
    setEditingId(null)
    setEditingImageUrl(null)
    setForm(emptyForm)
    resetImage()
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (form.publish_at && form.expires_at && new Date(form.expires_at) <= new Date(form.publish_at)) {
      showToast('La date de fin doit être après la date de début')
      return
    }
    setSubmitting(true)
    const supabase = createClient()

    let image_url: string | null = editingImageUrl ?? null
    if (rawImageSrc && croppedAreaPixels) {
      const blob = await getCroppedBlob(rawImageSrc, croppedAreaPixels)
      const path = `${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) {
        setSubmitting(false)
        showToast(`Erreur upload : ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('announcements').getPublicUrl(path)
      image_url = urlData.publicUrl
    }

    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      image_url,
      restaurant: form.restaurant || null,
      publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }

    if (editingId) {
      await supabase.from('announcements').update(payload).eq('id', editingId)
      showToast('Annonce modifiée !')
    } else {
      await supabase.from('announcements').insert({ ...payload, active: true, pinned: false })
      showToast(form.publish_at ? 'Publication programmée !' : 'Annonce publiée !')
    }

    closeMainModal()
    setSubmitting(false)
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f3f0' }}>
        <p className="text-sm" style={{ color: '#9ca3af' }}>Chargement...</p>
      </div>
    )
  }

  const previewImageUrl = croppedPreview ?? editingImageUrl ?? null

  return (
    <div className="min-h-screen pb-12" style={{ background: '#f5f3f0' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: '#1c1917' }}>
          {toast}
        </div>
      )}

      {/* ── Modal recadrage ── */}
      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}>
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-white font-semibold text-sm">Recadrer l'image</p>
            <button onClick={() => { setShowCropModal(false); if (!croppedPreview) resetImage() }}
              className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'white' }}>
              Annuler
            </button>
          </div>
          <div className="relative flex-1">
            <Cropper
              image={rawImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: 'transparent' },
                cropAreaStyle: { borderColor: '#f08816', borderWidth: 2 },
              }}
            />
          </div>
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <input type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1" style={{ accentColor: '#f08816' }} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <button onClick={confirmCrop} className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#f08816' }}>
              Confirmer le recadrage
            </button>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {deleteId && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteId(null)}
          onKeyDown={e => e.key === 'Escape' && setDeleteId(null)}
        >
          <div role="dialog" aria-modal="true"
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="font-bold text-base" style={{ color: '#1c1917' }}>Supprimer cette annonce ?</p>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Cette action est irréversible.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#ef4444' }}>
                Supprimer
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal créer / modifier ── */}
      {showModal && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeMainModal}
          onKeyDown={e => e.key === 'Escape' && closeMainModal()}
        >
          <div role="dialog" aria-modal="true"
            className="bg-white rounded-2xl mx-4 shadow-xl overflow-hidden"
            style={{ width: '100%', maxWidth: showPreview ? '820px' : '448px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #f5f3f0' }}>
              <h2 className="font-bold text-base" style={{ color: '#1c1917' }}>
                {editingId ? "Modifier l'annonce" : 'Nouvelle annonce'}
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={showPreview
                  ? { backgroundColor: '#1c1917', color: 'white' }
                  : { backgroundColor: '#f5f3f0', color: '#6b7280' }
                }
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                {showPreview ? 'Masquer aperçu' : 'Prévisualiser'}
              </button>
            </div>

            <div className={`flex gap-0 ${showPreview ? 'divide-x' : ''}`} style={{ borderColor: '#f5f3f0' }}>
              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-6 flex-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Titre *</label>
                  <input type="text" required value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex : Nouvelle formule déjeuner"
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ border: '1px solid #f0ebe4', outline: 'none', color: '#1c1917' }} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Contenu</label>
                  <textarea rows={3} value={form.body}
                    onChange={e => setForm({ ...form, body: e.target.value })}
                    placeholder="Description visible après 'En savoir plus'..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                    style={{ border: '1px solid #f0ebe4', outline: 'none', color: '#1c1917' }} />
                </div>

                {/* Image */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Image</label>
                  {(croppedPreview || editingImageUrl) ? (
                    <div className="flex flex-col gap-2">
                      <img src={croppedPreview ?? editingImageUrl!} alt="preview"
                        className="w-full rounded-xl object-cover" style={{ aspectRatio: '16/9' }} />
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                          style={{ backgroundColor: '#f5f3f0', color: '#1c1917' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Remplacer
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>
                        <button type="button" onClick={() => { resetImage(); setEditingImageUrl(null) }}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold"
                          style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer"
                      style={{ border: '1.5px dashed #f0ebe4', minHeight: '90px', backgroundColor: '#fafafa' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Cliquer pour ajouter une image</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>Restaurant ciblé</label>
                  <select value={form.restaurant} onChange={e => setForm({ ...form, restaurant: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ border: '1px solid #f0ebe4', outline: 'none', color: '#1c1917', backgroundColor: '#ffffff' }}>
                    <option value="">Tous les restaurants</option>
                    <option value="plaisance">Plaisance-du-Touch</option>
                    <option value="montauban">Montauban</option>
                    <option value="clermont">Clermont-Ferrand</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                      Début <span className="normal-case font-normal" style={{ color: '#d1d5db' }}>(opt.)</span>
                    </label>
                    <input type="datetime-local" value={form.publish_at}
                      onChange={e => setForm({ ...form, publish_at: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm"
                      style={{ border: '1px solid #f0ebe4', outline: 'none', color: form.publish_at ? '#1c1917' : '#9ca3af' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                      Fin <span className="normal-case font-normal" style={{ color: '#d1d5db' }}>(opt.)</span>
                    </label>
                    <input type="datetime-local" value={form.expires_at}
                      min={form.publish_at || undefined}
                      onChange={e => setForm({ ...form, expires_at: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm"
                      style={{ border: '1px solid #f0ebe4', outline: 'none', color: form.expires_at ? '#1c1917' : '#9ca3af' }} />
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: '#f08816' }}>
                    {submitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : form.publish_at ? 'Programmer' : 'Publier'}
                  </button>
                  <button type="button" onClick={closeMainModal}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}>
                    Annuler
                  </button>
                </div>
              </form>

              {/* Aperçu côté membre */}
              {showPreview && (
                <div className="flex-1 p-6" style={{ backgroundColor: '#f5f3f0' }}>
                  <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#b0a89e' }}>Aperçu membre</p>
                  <PreviewCard
                    title={form.title}
                    body={form.body}
                    imageUrl={previewImageUrl}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="px-4 pt-5 max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl px-6 pt-7 pb-6" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.06 }}>
            <circle cx="520" cy="-20" r="200" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="-20" cy="180" r="160" fill="none" stroke="white" strokeWidth="1"/>
          </svg>
          <div className="relative">
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin</p>
            <h1 className="text-2xl font-bold text-white mb-5">Annonces</h1>
            <div className="flex gap-5">
              {[
                { label: 'Total', value: stats.total, color: 'white' },
                { label: 'Publiées', value: stats.actives, color: '#16a34a' },
                { label: 'Programmées', value: stats.programmees, color: '#f08816' },
                { label: 'Expirées', value: stats.expirees, color: '#ef4444' },
                { label: 'Inactives', value: stats.inactives, color: '#9ca3af' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-5 flex flex-col gap-4">

        {/* ── Barre d'outils ── */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#f08816' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle annonce
          </button>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#ffffff', color: '#1c1917', outline: 'none' }}>
            <option value="tous">Tous les statuts</option>
            <option value="actives">Publiées</option>
            <option value="programmees">Programmées</option>
            <option value="expirees">Expirées</option>
            <option value="inactives">Inactives</option>
          </select>

          <select value={filterRestaurant} onChange={e => setFilterRestaurant(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#ffffff', color: '#1c1917', outline: 'none' }}>
            <option value="tous">Tous</option>
            <option value="global">Tous les restaurants</option>
            <option value="plaisance">Plaisance-du-Touch</option>
            <option value="montauban">Montauban</option>
            <option value="clermont">Clermont-Ferrand</option>
          </select>

          <span className="ml-auto text-xs font-medium" style={{ color: '#9ca3af' }}>
            {filtered.length} annonce{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Liste ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Aucune annonce</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="flex gap-4 p-4">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#f5f3f0' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {a.pinned && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f08816" stroke="none" className="flex-shrink-0">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        )}
                        <p className="font-semibold text-sm truncate" style={{ color: '#1c1917' }}>{a.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}>
                          {restaurantLabel(a.restaurant)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={
                            isExpired(a) ? { backgroundColor: '#fef2f2', color: '#ef4444' }
                            : isScheduled(a) ? { backgroundColor: '#fff7ed', color: '#f08816' }
                            : isLive(a) ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                            : { backgroundColor: '#f5f3f0', color: '#9ca3af' }
                          }>
                          {isExpired(a) ? 'Expirée' : isScheduled(a) ? 'Programmée' : isLive(a) ? 'Publiée' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {isScheduled(a) && a.publish_at && (
                      <p className="text-xs mb-0.5" style={{ color: '#f08816' }}>
                        Début le {new Date(a.publish_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {isExpired(a) && a.expires_at && (
                      <p className="text-xs mb-0.5" style={{ color: '#ef4444' }}>
                        Expirée le {new Date(a.expires_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {isLive(a) && a.expires_at && (
                      <p className="text-xs mb-0.5" style={{ color: '#9ca3af' }}>
                        Expire le {new Date(a.expires_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {a.body && <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#9ca3af' }}>{a.body}</p>}
                    <p className="text-xs mt-1.5" style={{ color: '#d1d5db' }}>
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t" style={{ borderColor: '#f5f3f0' }}>
                  <button onClick={() => toggleActive(a)}
                    className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                    style={{ color: isLive(a) ? '#6b7280' : '#16a34a' }}>
                    {isLive(a) ? (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>Désactiver</>
                    ) : (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>Publier</>
                    )}
                  </button>
                  <div style={{ width: '1px', backgroundColor: '#f5f3f0' }} />
                  <button onClick={() => togglePinned(a)}
                    className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                    style={{ color: a.pinned ? '#f08816' : '#9ca3af' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={a.pinned ? '#f08816' : 'none'} stroke={a.pinned ? '#f08816' : 'currentColor'} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {a.pinned ? 'Épinglée' : 'Épingler'}
                  </button>
                  <div style={{ width: '1px', backgroundColor: '#f5f3f0' }} />
                  <button onClick={() => openEdit(a)}
                    className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                    style={{ color: '#f08816' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Modifier
                  </button>
                  <div style={{ width: '1px', backgroundColor: '#f5f3f0' }} />
                  <button onClick={() => setDeleteId(a.id)}
                    className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                    style={{ color: '#ef4444' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
