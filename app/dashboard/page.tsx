'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  name: string
  points: number
}

function getTier(points: number) {
  if (points >= 500) return { label: 'Gold', next: null, min: 500, max: 500, color: '#b8860b' }
  if (points >= 200) return { label: 'Silver', next: 500, min: 200, max: 500, color: '#6b7280' }
  return { label: 'Bronze', next: 200, min: 0, max: 200, color: '#b45309' }
}

// Icônes SVG sur mesure
function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [voucherCount, setVoucherCount] = useState(0)
  const [qrExpanded, setQrExpanded] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  function handleDownload() {
    if (!qrCanvasRef.current || !profile || !userId) return
    const tier = getTier(profile.points)

    const qrSize = 240
    const padding = 36
    const headerH = 90
    const infoH = 70
    const footerH = 32
    const totalW = qrSize + padding * 2
    const totalH = headerH + infoH + qrSize + footerH + padding

    const canvas = document.createElement('canvas')
    canvas.width = totalW * 2
    canvas.height = totalH * 2
    canvas.style.width = `${totalW}px`
    canvas.style.height = `${totalH}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, totalW, totalH)

    // Dark header
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(0, 0, totalW, headerH)

    // MOYA
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('MOYA', totalW / 2, 38)

    // Restaurant subtitle
    ctx.fillStyle = '#f08816'
    ctx.font = '500 9px Arial'
    ctx.letterSpacing = '3px'
    ctx.fillText('RESTAURANT JAPONAIS', totalW / 2, 56)
    ctx.letterSpacing = '0px'

    // Divider line in header
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(padding, 70)
    ctx.lineTo(totalW - padding, 70)
    ctx.stroke()

    // Tier badge
    ctx.fillStyle = tier.color
    ctx.font = '600 10px Arial'
    ctx.fillText(`● ${tier.label.toUpperCase()}`, totalW / 2, 84)

    // Customer name
    ctx.fillStyle = '#1c1917'
    ctx.font = 'bold 17px Arial'
    ctx.fillText(profile.name, totalW / 2, headerH + 28)

    // Points
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px Arial'
    ctx.fillText(`${profile.points} points`, totalW / 2, headerH + 50)

    // Separator
    ctx.strokeStyle = '#f0ebe4'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, headerH + 62)
    ctx.lineTo(totalW - padding, headerH + 62)
    ctx.stroke()

    // QR code from hidden canvas
    const qrTop = headerH + infoH
    ctx.drawImage(qrCanvasRef.current, padding, qrTop, qrSize, qrSize)

    // Footer
    ctx.fillStyle = '#d1d5db'
    ctx.font = '10px Arial'
    ctx.fillText('Présentez ce QR code au restaurant', totalW / 2, qrTop + qrSize + footerH - 10)

    const link = document.createElement('a')
    link.download = `moya-${profile.name.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [{ data: profileData }, { count }] = await Promise.all([
        supabase.from('profiles').select('name, points').eq('id', user.id).single(),
        supabase.from('vouchers').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'unused'),
      ])

      if (profileData) setProfile(profileData)
      if (count !== null) setVoucherCount(count)
    }
    load()
  }, [router])

  if (!userId || !profile) {
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
      {/* QR canvas caché pour le téléchargement */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <QRCodeCanvas value={userId} size={240} ref={qrCanvasRef} />
      </div>

      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* Greeting */}
        <div className="pt-2">
          <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Bienvenue</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{profile.name}</h1>
        </div>

        {/* Points & tier card */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }}
        >
          {/* Motif japonais */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.5'%3E%3Ccircle cx='20' cy='20' r='15'/%3E%3Ccircle cx='0' cy='0' r='15'/%3E%3Ccircle cx='40' cy='0' r='15'/%3E%3Ccircle cx='0' cy='40' r='15'/%3E%3Ccircle cx='40' cy='40' r='15'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <span style={{ color: tier.color }}><IconStar /></span>
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: tier.color }}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-4xl font-bold text-white">{profile.points}</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>points</p>
              </div>
              <div className="text-right">
                {tier.next && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    encore <span className="font-semibold text-white">{tier.next - profile.points}</span> pts
                    <br />pour {tier.label === 'Bronze' ? 'Silver' : 'Gold'}
                  </p>
                )}
                {!tier.next && (
                  <p className="text-xs font-medium" style={{ color: '#f08816' }}>Niveau maximum</p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {tier.next && (
              <div className="mt-5">
                <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: '#f08816' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{tier.label}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {tier.label === 'Bronze' ? 'Silver' : 'Gold'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QR Code */}
        <button
          onClick={() => setQrExpanded(true)}
          className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-sm w-full text-left hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-gray-800">Mon QR code</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>Appuyer pour agrandir · À présenter au restaurant</p>
          </div>
          <div className="p-3 rounded-xl" style={{ border: '1.5px solid #f0ebe4' }}>
            <QRCodeSVG value={userId} size={120} />
          </div>
        </button>

        {/* QR Code modal */}
        {qrExpanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setQrExpanded(false)}
          >
            <div
              className="bg-white rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl mx-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-1">
                <p className="text-base font-semibold text-gray-900">Mon QR code</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>À présenter au restaurant</p>
              </div>
              <div className="p-4 rounded-2xl" style={{ border: '2px solid #f0ebe4' }}>
                <QRCodeSVG value={userId} size={220} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                >
                  Télécharger
                </button>
                <button
                  onClick={() => setQrExpanded(false)}
                  className="px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/vouchers" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed', color: '#f08816' }}>
                <IconGift />
              </div>
              <span className="text-gray-300 group-hover:text-gray-400 transition-colors"><IconArrow /></span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{voucherCount}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>bon{voucherCount > 1 ? 's' : ''} disponible{voucherCount > 1 ? 's' : ''}</p>
          </Link>

          <Link href="/dashboard/history" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <IconHistory />
              </div>
              <span className="text-gray-300 group-hover:text-gray-400 transition-colors"><IconArrow /></span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{profile.points}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>points cumulés</p>
          </Link>
        </div>

      </div>
    </div>
  )
}
