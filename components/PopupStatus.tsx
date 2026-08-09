"use client"
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQRCode } from 'next-qrcode';
import { useEffect, useRef, useState } from "react"
import Button from './Button';
import { TOAST_LEVEL_COLORS } from './Toast';

export interface PopupStatusProps {
  message: string
  type: "success" | "error" | "info"
  fileId?: string
  uploading?: boolean
  progress?: number
  fileMeta?: Array<{
    name: string
    size: number
    img?: string
  }>
  btnText?: string
  fileType?: "file" | "secret"
}

const PopupStatus = ({ message, type, fileId, uploading, progress, fileMeta, btnText, fileType = "file" }: PopupStatusProps) => {
  const [status, setStatus] = useState<PopupStatusProps | null>({ message, type, fileId, uploading, progress, fileMeta })
  const [qrcodePopup, setQrcodePopup] = useState<string | null>(null)
  const { Canvas } = useQRCode();
  const qrCodeRef = useRef<HTMLDivElement | null>(null);

  const handleQrCode = () => {
    if (!fileId) return
    const link = `${globalThis.location.origin}/${fileType}/${fileId}`
    setQrcodePopup(link)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus({ message, type, fileId, uploading, progress, fileMeta })
  }, [message, type, fileId, uploading, progress, fileMeta])

  const copyLink = async () => {
    if (!fileId) return
    const link = `${globalThis.location.origin}/${fileType}/${fileId}`
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = link
        textarea.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setStatus(prev => prev ? { ...prev, message: "Copied to clipboard!", type: 'success' } : null)
    } catch {
      setStatus(prev => prev ? { ...prev, message: "Failed to copy. Please try manually.", type: 'error' } : null)
    }
  }

  const CLASS_NAMES = {
    success: "bg-[#ecf1ea] border border-[#b6d5b6] dark:bg-[#141e10] dark:border-[#305531]",
    error: "bg-[#f8d7da] border border-[#f5c6cb] dark:bg-[#402f2c] dark:border-[#6a3b37]",
    info: "bg-[#d1ecf1] border border-[#bee5eb] dark:bg-[#24363e] dark:border-[#194f6a]"
  }

  useEffect(() => {
    if (qrCodeRef.current) {
      const handleClickOutside = (event: MouseEvent) => {
        if (qrCodeRef.current && !qrCodeRef.current.contains(event.target as Node)) {
          setQrcodePopup(null)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [qrCodeRef])

  return (
    <div className={`lg:w-150 w-full mb-4 p-4 px-4.5 flex gap-2.5 flex-col border-2 rounded-[20px] ${CLASS_NAMES[status?.type || 'info']} `}>
      <div className="flex justify-between items-center">
        <div className="flex gap-3 items-center">
          <span className={`py-1 px-2.5 text-[10.5px] uppercase tracking-[0.03em] shrink-0 font-extrabold rounded-full ${TOAST_LEVEL_COLORS[status?.type || 'info']}`}>
            {type.toLocaleUpperCase()}
          </span>
          <span className='text-[14px] font-semibold'>{status?.message}</span>
        </div>
        {uploading && <span className="text-sm font-semibold">{status?.progress}%</span>}
      </div>

      {qrcodePopup && (
        <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 dark:bg-black/50 z-50">
          <div ref={qrCodeRef} className="bg-card dark:bg-card-dark border border-card dark:border-card-dark p-6 rounded-lg shadow-lg w-96">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">QR Code</h2>
              <div className="flex items-center justify-center cursor-pointer" onClick={() => setQrcodePopup(null)}>
                <FontAwesomeIcon icon={faCircleXmark} className="text-gray-700 dark:text-gray-300 scale-150 hover:text-gray-500 transition" />
              </div>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">Scan this QR code to access the file.</p>
            <div className="flex items-center justify-center gap-2">
              <Canvas
                text={qrcodePopup}
                options={{
                  errorCorrectionLevel: "H",
                  scale: 6,
                  quality: 0.8,
                  color: {
                    light: "#fdfbfa"
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="mt-2 w-full">
          <div className="w-full bg-[#c8e2f0] dark:bg-[#083f59] rounded-full h-2">
            <div
              className="bg-[#004688] dark:bg-[#58cffe] h-2 rounded-full transition-all duration-200"
              style={{ width: `${status?.progress}% ` }}
            />
          </div>
        </div>
      )}
      {fileId && !uploading && type === 'success' && (
        <div className="flex w-full mt-2 gap-2">
          <Button
            text={btnText || "Copy download link"}
            onClick={() => copyLink()}
            divClass='w-full'
            variant='secondary'
          />
          <Button
            text="QR"
            title="Show QR code"
            onClick={() => handleQrCode()}
            divClass='w-fit'
            variant='secondary'
          />
        </div>
      )}
    </div>
  )
}

export default PopupStatus
