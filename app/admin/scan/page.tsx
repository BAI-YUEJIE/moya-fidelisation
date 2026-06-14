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

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [voucher, setVoucher] = useState<VoucherResult | null>(null)
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
    setVoucher(null)
    setError(null)
    setScanning(true)

    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (token: string) => {
          await scanner.stop()
          setScanning(false)
          console.log('Token scanné:', token)
          await lookupVoucher(token)
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

  async function lookupVoucher(token: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('vouchers')
      .select('id, status, used_at, type, rewards(name), profiles(name)')
      .eq('token', token)
      .single()

    if (!data) {
      setError('QR code invalide ou introuvable.')
      return
    }
    setVoucher(data as unknown as VoucherResult)
  }

  async function handleValidate() {
    if (!voucher) return
    setValidating(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase
      .from('vouchers')
      .update({ status: 'used', used_at: now })
      .eq('id', voucher.id)

    setVoucher({ ...voucher, status: 'used', used_at: now })
    setValidating(false)
  }

  function reset() {
    setVoucher(null)
    setError(null)
  }

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Scanner un bon</h1>

        {/* Scanner area */}
        {!voucher && !error && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-4">
            <div id="qr-reader" className={`w-full ${scanning ? 'block' : 'hidden'}`} />

            {!scanning ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
                  📷
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Appuyez sur le bouton pour scanner le QR code du client
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
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">
              ✕
            </div>
            <p className="font-semibold text-gray-900">QR code invalide</p>
            <p className="text-sm text-gray-500 text-center">{error}</p>
            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Voucher result */}
        {voucher && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                voucher.status === 'unused' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {voucher.status === 'unused' ? '✓' : '✕'}
              </div>
              <div>
                <p className="font-bold text-gray-900">{voucher.rewards.name}</p>
                <p className="text-sm text-gray-500">
                  {voucher.profiles?.name ?? 'Code cadeau'}
                  {' · '}
                  {voucher.type === 'promo' ? 'Cadeau' : 'Échange de points'}
                </p>
              </div>
            </div>

            {voucher.status === 'unused' ? (
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
                {voucher.used_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Le {new Date(voucher.used_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Scanner un autre bon
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
