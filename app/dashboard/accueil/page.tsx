'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { getTier } from '@/lib/utils'
import { useUser } from '../user-context'
type Announcement = {
  id: string
  title: string
  body: string | null
  image_url: string | null
  created_at: string
  restaurant: string | null
  pinned: boolean
  publish_at: string | null
  expires_at: string | null
}

const RESTAURANTS = [
  {
    key: 'plaisance',
    name: 'MOYA Plaisance du Touch',
    city: 'Plaisance-du-Touch',
    address: '3 Imp. Louis Vicat, 31830 Plaisance-du-Touch',
    website: 'moya31830.fr',
    websiteUrl: 'https://moya31830.fr',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=MOYA+restaurant+japonais+Plaisance-du-Touch',
  },
  {
    key: 'montauban',
    name: 'MOYA Montauban',
    city: 'Montauban',
    address: '2d Rue Voltaire, 82000 Montauban',
    website: 'moya82.fr',
    websiteUrl: 'https://moya82.fr',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=MOYA+restaurant+japonais+Montauban',
  },
  {
    key: 'clermont',
    name: 'MOYA',
    city: 'Clermont-Ferrand',
    address: '5 Rue Eugène Gilbert, 63000 Clermont-Ferrand',
    website: 'moya63.com',
    websiteUrl: 'https://moya63.com',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=MOYA+restaurant+japonais+Clermont-Ferrand',
  },
]

const STORAGE_KEY = 'moya_selected_restaurant'

export default function AccueilPage() {
  const { userId, userName, points } = useUser()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [voucherCount, setVoucherCount] = useState(0)
  const [qrExpanded, setQrExpanded] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  function handleDownload() {
    if (!qrCanvasRef.current || !userId || !userName) return
    const tier = getTier(points)
    const qrSize = 240, padding = 36, headerH = 90, infoH = 70, footerH = 32
    const totalW = qrSize + padding * 2
    const totalH = headerH + infoH + qrSize + footerH + padding
    const canvas = document.createElement('canvas')
    canvas.width = totalW * 2; canvas.height = totalH * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, totalW, totalH)
    ctx.fillStyle = '#1c1917'; ctx.fillRect(0, 0, totalW, headerH)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'
    ctx.fillText('MOYA', totalW / 2, 38)
    ctx.fillStyle = '#f08816'; ctx.font = '500 9px Arial'
    ctx.fillText('RESTAURANT JAPONAIS', totalW / 2, 56)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(padding, 70); ctx.lineTo(totalW - padding, 70); ctx.stroke()
    ctx.fillStyle = tier.color; ctx.font = '600 10px Arial'
    ctx.fillText(`● ${tier.label.toUpperCase()}`, totalW / 2, 84)
    ctx.fillStyle = '#1c1917'; ctx.font = 'bold 17px Arial'
    ctx.fillText(userName, totalW / 2, headerH + 28)
    ctx.fillStyle = '#9ca3af'; ctx.font = '12px Arial'
    ctx.fillText(`${points} points`, totalW / 2, headerH + 50)
    ctx.strokeStyle = '#f0ebe4'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padding, headerH + 62); ctx.lineTo(totalW - padding, headerH + 62); ctx.stroke()
    ctx.drawImage(qrCanvasRef.current, padding, headerH + infoH, qrSize, qrSize)
    ctx.fillStyle = '#d1d5db'; ctx.font = '10px Arial'
    ctx.fillText('Présentez ce QR code au restaurant', totalW / 2, headerH + infoH + qrSize + footerH - 10)
    const link = document.createElement('a')
    link.download = `moya-${userName.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png'); link.click()
  }
  const [selectedIdx, setSelectedIdx] = useState(() => {
    if (typeof window === 'undefined') return 0
    const saved = localStorage.getItem(STORAGE_KEY)
    const idx = saved ? parseInt(saved, 10) : 0
    return idx >= 0 && idx < RESTAURANTS.length ? idx : 0
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [tipsOpen, setTipsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  function selectRestaurant(i: number) {
    setSelectedIdx(i)
    localStorage.setItem(STORAGE_KEY, String(i))
  }

  useEffect(() => {
    if (!userId) return
    async function load() {
      const supabase = createClient()
      const [{ data: announcementsData }, { count }] = await Promise.all([
        supabase.from('announcements').select('id, title, body, image_url, created_at, restaurant, pinned, publish_at, expires_at').eq('active', true).or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('vouchers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'unused'),
      ])
      if (announcementsData) setAnnouncements(announcementsData)
      setVoucherCount(count ?? 0)
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen pb-12" style={{ background: '#f5f3f0' }}>
        <div className="max-w-xl mx-auto px-4 pt-6 flex flex-col gap-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
          <div className="skeleton h-36 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
      </div>
    )
  }

  const tier = getTier(points)
  const progressPct = tier.next ? Math.min(100, Math.round((points / tier.next) * 100)) : 100
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const selected = RESTAURANTS[selectedIdx]

  const visibleAnnouncements = announcements.filter(
    a => a.restaurant === null || a.restaurant === selected.key
  )

  // Vérifie si un restaurant a des annonces (pour le point orange)
  function hasAnnouncements(key: string) {
    return announcements.some(a => a.restaurant === null || a.restaurant === key)
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: '#f5f3f0' }}>
      {/* Canvas caché pour le téléchargement */}
      {userId && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <QRCodeCanvas value={userId} size={240} ref={qrCanvasRef} />
        </div>
      )}

      {/* Modal QR code plein écran */}
      {qrExpanded && userId && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setQrExpanded(false)}
          onKeyDown={e => e.key === 'Escape' && setQrExpanded(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl mx-6"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-base font-bold text-center" style={{ color: '#1c1917' }}>Mon QR code</p>
              <p className="text-xs text-center mt-0.5" style={{ color: '#9ca3af' }}>À présenter au restaurant</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ border: '2px solid #f0ebe4' }}>
              <QRCodeSVG value={userId} size={220} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#f08816', color: '#ffffff' }}
              >
                Télécharger
              </button>
              <button
                onClick={() => setQrExpanded(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-6 flex flex-col gap-4 animate-fade-in">

        {/* ── Hero card ── */}
        <div className="relative overflow-hidden rounded-2xl px-5 py-6" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 200" preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.07 }}>
            <circle cx="420" cy="-20" r="200" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="420" cy="-20" r="130" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="-10" cy="200" r="160" fill="none" stroke="white" strokeWidth="1"/>
          </svg>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{greeting},</p>
              <h1 className="text-2xl font-bold text-white mb-3">{userName || '—'}</h1>
              {userName && (
                <>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold" style={{ color: '#f08816' }}>{points}</span>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>points</span>
                    <span className="ml-1 text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${tier.color}25`, color: tier.color, border: `1px solid ${tier.color}40` }}>
                      {tier.label}
                    </span>
                  </div>
                  {tier.next !== null ? (
                    <>
                      <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="h-full rounded-full animate-progress" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #f08816, #f5a623)' }} />
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {tier.next - points} pts avant le niveau {tier.nextLabel}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Niveau maximum — Gold</p>
                  )}
                </>
              )}
            </div>

            {/* Mini QR code */}
            {userId && (
              <button
                onClick={() => setQrExpanded(true)}
                className="flex-shrink-0 rounded-xl overflow-hidden bg-white p-2"
              >
                <QRCodeSVG value={userId} size={72} />
              </button>
            )}
          </div>
        </div>

        {/* ── Actions rapides ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: 'Mon profil',
              href: '/dashboard/profile',
              badge: null,
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ),
            },
            {
              label: 'Récompenses',
              href: '/dashboard/rewards',
              badge: null,
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                  <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                  <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                </svg>
              ),
            },
            {
              label: 'Mes bons',
              href: '/dashboard/vouchers',
              badge: voucherCount > 0 ? voucherCount : null,
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <circle cx="7" cy="12" r="1" fill="#f08816" stroke="none"/>
                  <circle cx="17" cy="12" r="1" fill="#f08816" stroke="none"/>
                  <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2"/>
                </svg>
              ),
            },
          ].map(({ label, href, badge, icon }) => (
            <Link key={label} href={href}
              className="relative flex flex-col items-center gap-2 rounded-2xl py-4 bg-white shadow-sm"
              style={{ border: '1px solid rgba(0,0,0,0.04)' }}
            >
              {badge !== null && (
                <span className="absolute top-2.5 right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: '#f08816', fontSize: '10px' }}>
                  {badge}
                </span>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef3e2' }}>
                {icon}
              </div>
              <span className="text-xs font-semibold" style={{ color: '#1c1917' }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Sélecteur de restaurant ── */}
        <section>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#b0a89e' }}>Nos restaurants</p>

          {/* Tabs ville */}
          <div className="flex gap-2 mb-3">
            {RESTAURANTS.map((r, i) => (
              <button
                key={r.key}
                onClick={() => selectRestaurant(i)}
                className="relative flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={selectedIdx === i
                  ? { backgroundColor: '#1c1917', color: '#ffffff' }
                  : { backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid rgba(0,0,0,0.06)' }
                }
              >
                {r.city}
                {/* Point orange si des annonces existent pour ce restaurant */}
                {hasAnnouncements(r.key) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: selectedIdx === i ? '#f08816' : '#f08816' }} />
                )}
              </button>
            ))}
          </div>

          {/* Carte restaurant sélectionné */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #f5f3f0' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#fef3e2' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f08816" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1c1917' }}>{selected.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{selected.address}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3">
              <a href={selected.mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: '#1c1917', color: '#ffffff' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Itinéraire
              </a>
              <a href={selected.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: '#f5f3f0', color: '#1c1917' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                {selected.website}
              </a>
            </div>
          </div>
        </section>

        {/* ── Actualités ── */}
        <section>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#b0a89e' }}>
            Actualités · {selected.city}
          </p>
          {visibleAnnouncements.length > 0 ? (
            <div
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {visibleAnnouncements.map(a => {
                const isExpanded = expandedIds.has(a.id)
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden flex-shrink-0"
                    style={{
                      width: visibleAnnouncements.length === 1 ? '100%' : '82%',
                      scrollSnapAlign: 'start',
                      border: '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    {a.image_url && (
                      <img
                        src={a.image_url}
                        alt={a.title}
                        className="w-full object-cover"
                        style={{ aspectRatio: '16/9' }}
                      />
                    )}
                    <div className="p-4">
                      <p className="text-xs mb-1" style={{ color: '#b0a89e' }}>
                        {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm" style={{ color: '#1c1917' }}>{a.title}</p>
                        {a.pinned && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f08816" stroke="none" className="flex-shrink-0 mt-0.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        )}
                      </div>
                      {a.body && (
                        <>
                          {isExpanded && (
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: '#6b7280' }}>{a.body}</p>
                          )}
                          <button
                            onClick={() => setExpandedIds(prev => {
                              const next = new Set(prev)
                              isExpanded ? next.delete(a.id) : next.add(a.id)
                              return next
                            })}
                            className="text-xs font-semibold mt-2"
                            style={{ color: '#f08816' }}
                          >
                            {isExpanded ? 'Réduire ↑' : 'En savoir plus →'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl px-4 py-5 flex items-center gap-3 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#f5f3f0' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Aucune actualité pour le moment</p>
            </div>
          )}
        </section>

        {/* ── Comment gagner des points (repliable) ── */}
        <section>
          <button
            onClick={() => setTipsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white rounded-2xl shadow-sm"
            style={{ border: '1px solid rgba(0,0,0,0.04)' }}
          >
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#b0a89e' }}>Comment gagner des points ?</p>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: tipsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {tipsOpen && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-1" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
              {[
                { n: '1', title: 'Venez au restaurant', desc: 'Présentez votre QR code à la caisse lors de chaque visite.' },
                { n: '2', title: 'Accumulez des points', desc: 'Chaque passage vous rapporte des points selon vos dépenses.' },
                { n: '3', title: 'Échangez vos récompenses', desc: 'Utilisez vos points pour des réductions ou cadeaux exclusifs.' },
              ].map((step, i, arr) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5"
                  style={i < arr.length - 1 ? { borderBottom: '1px solid #f5f3f0' } : {}}>
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: '#f08816' }}>
                    {step.n}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1c1917' }}>{step.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#9ca3af' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
