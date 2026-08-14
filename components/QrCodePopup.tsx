"use client"

import { Button } from "@/components"
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons"
import { useEffect, useRef } from "react"
import { useQRCode } from "next-qrcode"

const QrCodePopup = ({ link, onClose }: { link: string; onClose: () => void }) => {
  const { Canvas } = useQRCode()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 z-50">
      <div
        ref={ref}
        aria-modal="true"
        aria-labelledby="qr-title"
        className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark p-6 rounded-2xl w-110"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 id="qr-title" className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">QR Code</h3>
          <Button onClick={onClose} icon={faCircleXmark} variant="ghost" divClass="text-xl! p-0!" title="Close" />
        </div>

        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Scan this QR code to access the file.</p>
        <div className="flex items-center justify-center">
          <Canvas
            text={link}
            options={{ errorCorrectionLevel: "H", scale: 6, quality: 0.8, color: { light: "#fdfbfa" } }}
          />
        </div>
      </div>
    </div>
  )
}

export default QrCodePopup
