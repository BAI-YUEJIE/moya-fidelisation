'use client'

import { QRCodeSVG } from 'qrcode.react'

type Props = {
  userId: string
}

export default function QRCodeDisplay({ userId }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <QRCodeSVG value={userId} size={180} />
      </div>
      <p className="text-xs text-gray-400">Mon QR code personnel</p>
    </div>
  )
}
