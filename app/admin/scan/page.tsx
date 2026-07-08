'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type VoucherResult = {
  id: string
  status: 'unused' | 'used'
  used_at: string | null
  type: string
  rewards: { name: string }
  profiles: { name: string } | null
}

type MemberResult = {
  id: string
  name: string
  points: number
  birthday: string
  created_at: string
}

type ScanResult =
  | { kind: 'voucher'; data: VoucherResult }
  | { kind: 'member'; data: MemberResult }

function getTier(points: number) {
  if (points >= 500) return { label: 'Gold', color: '#b8860b', bg: 'rgba(184,134,11,0.1)' }
  if (points >= 200) return { label: 'Silver', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }
  return { label: 'Bronze', color: '#b45309', bg: 'rgba(180,83,9,0.1)' }
}

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0].split('-').reverse().join('/')
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('')
  const [addingPoints, setAddingPoints] = useState(false)
  const [pointsSuccess, setPointsSuccess] = useState(false)
  const scannerRef = useRef<unknown>(null)

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current as { stop: () => Promise<void> } | null
      if (scanner) scanner.stop().catch(() => {})
    }
  }, [])

  async function startScanner() {
    setResult(null)
    setError(null)
    setScanning(true)

    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (scanned: string) => {
          await scanner.stop()
          setScanning(false)
          await lookup(scanned)
        },
        () => {}
      )
    } catch {
      setScanning(false)
      setError("Impossible d'accéder à la caméra.")
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current as { stop: () => Promise<void> } | null
    if (scanner) await scanner.stop().catch(() => {})
    setScanning(false)
  }

  async function lookup(scanned: string) {
    const supabase = createClient()

    const { data: voucherData } = await supabase
      .from('vouchers')
      .select('id, status, used_at, type, rewards(name), profiles(name)')
      .eq('token', scanned)
      .single()

    if (voucherData) {
      setResult({ kind: 'voucher', data: voucherData as unknown as VoucherResult })
      return
    }

    const { data: memberData } = await supabase
      .from('profiles')
      .select('id, name, points, birthday, created_at')
      .eq('id', scanned)
      .single()

    if (memberData) {
      setResult({ kind: 'member', data: memberData as MemberResult })
      return
    }

    setError('QR code invalide ou introuvable.')
  }

  async function handleValidate() {
    if (result?.kind !== 'voucher') return
    setValidating(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('vouchers').update({ status: 'used', used_at: now }).eq('id', result.data.id)
    setResult({ kind: 'voucher', data: { ...result.data, status: 'used', used_at: now } })
    setValidating(false)
  }

  async function handleAddPoints() {
    if (result?.kind !== 'member') return
    const amount = parseInt(pointsAmount)
    if (isNaN(amount) || amount <= 0) return

    setAddingPoints(true)
    const supabase = createClient()
    const newPoints = result.data.points + amount

    await Promise.all([
      supabase.from('profiles').update({ points: newPoints }).eq('id', result.data.id),
      supabase.from('points_history').insert({
        user_id: result.data.id,
        amount,
        reason: 'ajout_manuel',
        description: null,
      }),
    ])

    setResult({ kind: 'member', data: { ...result.data, points: newPoints } })
    setPointsAmount('')
    setPointsSuccess(true)
    setAddingPoints(false)
    setTimeout(() => setPointsSuccess(false), 3000)
  }

  function reset() {
    setResult(null)
    setError(null)
    setPointsAmount('')
    setPointsSuccess(false)
  }

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{ background: '#f5f3f0' }}>
      <div className="max-w-md mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="pt-2">
          <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>Administration</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Scanner</h1>
        </div>

        {/* Zone scanner */}
        {!result && !error && (
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-5">
            <div id="qr-reader" className={`w-full rounded-xl overflow-hidden ${scanning ? 'block' : 'hidden'}`} />

            {!scanning ? (
              <>
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: '#fff7ed', color: '#f08816' }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Scanner un QR code</p>
                  <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                    QR code personnel d'un membre ou bon de récompense
                  </p>
                </div>
                <button
                  onClick={startScanner}
                  className="w-full py-3 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                >
                  Démarrer le scan
                </button>
              </>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                Annuler
              </button>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#fef2f2' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">QR code invalide</p>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>{error}</p>
            </div>
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#f08816', color: '#ffffff' }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Résultat : bon */}
        {result?.kind === 'voucher' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">

            {/* Statut header */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={result.data.status === 'unused'
                  ? { backgroundColor: '#f0fdf4' }
                  : { backgroundColor: '#f3f4f6' }
                }
              >
                {result.data.status === 'unused' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900">{result.data.rewards.name}</p>
                <p className="text-sm" style={{ color: '#9ca3af' }}>
                  {result.data.profiles?.name ?? 'Code cadeau'} · {result.data.type === 'promo' ? 'Cadeau' : 'Échange'}
                </p>
              </div>
            </div>

            {result.data.status === 'unused' ? (
              <>
                <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p className="text-sm font-medium" style={{ color: '#16a34a' }}>Bon valide — non utilisé</p>
                </div>
                <button
                  onClick={handleValidate}
                  disabled={validating}
                  className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                >
                  {validating ? 'Validation...' : 'Valider et marquer comme utilisé'}
                </button>
              </>
            ) : (
              <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#f3f4f6' }}>
                <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Ce bon a déjà été utilisé</p>
                {result.data.used_at && (
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                    Le {formatDate(result.data.used_at)}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
            >
              Scanner un autre
            </button>
          </div>
        )}

        {/* Résultat : membre */}
        {result?.kind === 'member' && (() => {
          const tier = getTier(result.data.points)
          return (
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">

              {/* Infos membre */}
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ backgroundColor: 'rgba(240,136,22,0.1)', color: '#f08816' }}
                >
                  {result.data.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{result.data.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-semibold" style={{ color: '#f08816' }}>{result.data.points} pts</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: tier.bg, color: tier.color }}>
                      {tier.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Détails */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f0ebe4' }}>
                {[
                  { label: 'Date de naissance', value: formatDate(result.data.birthday) },
                  { label: 'Membre depuis', value: formatDate(result.data.created_at) },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex justify-between px-4 py-3"
                    style={i === 0 ? { borderBottom: '1px solid #f0ebe4' } : {}}
                  >
                    <span className="text-sm" style={{ color: '#9ca3af' }}>{row.label}</span>
                    <span className="text-sm font-medium text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Ajouter des points */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#f5f3f0' }}>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                  Ajouter des points
                </p>
                {pointsSuccess && (
                  <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    ✓ Points ajoutés avec succès
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="ex : 50"
                    value={pointsAmount}
                    onChange={e => setPointsAmount(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: '1px solid #f0ebe4', color: '#1c1917', backgroundColor: '#ffffff' }}
                  />
                  <button
                    onClick={handleAddPoints}
                    disabled={addingPoints || !pointsAmount || parseInt(pointsAmount) <= 0}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#f08816', color: '#ffffff' }}
                  >
                    {addingPoints ? '...' : 'Ajouter'}
                  </button>
                </div>
              </div>

              <button
                onClick={reset}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                Scanner un autre
              </button>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
