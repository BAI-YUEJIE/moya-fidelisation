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

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
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

    // 1. Chercher dans les vouchers
    const { data: voucherData } = await supabase
      .from('vouchers')
      .select('id, status, used_at, type, rewards(name), profiles(name)')
      .eq('token', scanned)
      .single()

    if (voucherData) {
      setResult({ kind: 'voucher', data: voucherData as unknown as VoucherResult })
      return
    }

    // 2. Chercher dans les membres (QR code personnel)
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
    await supabase
      .from('vouchers')
      .update({ status: 'used', used_at: now })
      .eq('id', result.data.id)

    setResult({ kind: 'voucher', data: { ...result.data, status: 'used', used_at: now } })
    setValidating(false)
  }

  function reset() {
    setResult(null)
    setError(null)
  }

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Scanner</h1>

        {/* Scanner area */}
        {!result && !error && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-4">
            <div id="qr-reader" className={`w-full ${scanning ? 'block' : 'hidden'}`} />

            {!scanning ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
                  📷
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Scanner le QR code personnel d'un membre ou un bon de récompense
                </p>
                <button
                  onClick={startScanner}
                  className="w-full py-3 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800"
                >
                  Démarrer le scan
                </button>
              </>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl text-red-500 font-bold">
              ✕
            </div>
            <p className="font-semibold text-gray-900">QR code invalide</p>
            <p className="text-sm text-gray-500 text-center">{error}</p>
            <button onClick={reset} className="w-full py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800">
              Réessayer
            </button>
          </div>
        )}

        {/* Voucher result */}
        {result?.kind === 'voucher' && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                result.data.status === 'unused' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {result.data.status === 'unused' ? '✓' : '✕'}
              </div>
              <div>
                <p className="font-bold text-gray-900">{result.data.rewards.name}</p>
                <p className="text-sm text-gray-500">
                  {result.data.profiles?.name ?? 'Code cadeau'}
                  {' · '}
                  {result.data.type === 'promo' ? 'Cadeau' : 'Échange de points'}
                </p>
              </div>
            </div>

            {result.data.status === 'unused' ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-green-800">Bon valide — non utilisé</p>
                </div>
                <button
                  onClick={handleValidate}
                  disabled={validating}
                  className="w-full py-3 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {validating ? 'Validation...' : 'Valider et marquer comme utilisé'}
                </button>
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-gray-700">Ce bon a déjà été utilisé</p>
                {result.data.used_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Le {new Date(result.data.used_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            <button onClick={reset} className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
              Scanner un autre
            </button>
          </div>
        )}

        {/* Member result */}
        {result?.kind === 'member' && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <p className="font-bold text-gray-900">{result.data.name}</p>
                <p className="text-sm text-gray-500">Membre</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-gray-500">Points</span>
                <span className="text-sm font-semibold text-gray-900">{result.data.points}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-gray-500">Date de naissance</span>
                <span className="text-sm text-gray-900">
                  {new Date(result.data.birthday).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-gray-500">Membre depuis</span>
                <span className="text-sm text-gray-900">
                  {new Date(result.data.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <button onClick={reset} className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
              Scanner un autre
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
