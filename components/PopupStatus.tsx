"use client"

import { useEffect, useState } from "react"

export interface PopupStatusProps {
  message: string
  data?: string
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

const PopupStatus = ({ message, data, type, fileId, uploading, progress, fileMeta, btnText, fileType = "file" }: PopupStatusProps) => {
  const [status, setStatus] = useState<PopupStatusProps | null>({ message, data, type, fileId, uploading, progress, fileMeta })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus({ message, data, type, fileId, uploading, progress, fileMeta })
  }, [message, data, type, fileId, uploading, progress, fileMeta])

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
    success: "bg-green-100 text-green-700 border border-green-200",
    error: "bg-red-100 text-red-700 border border-red-200",
    info: "bg-blue-100 text-blue-700 border border-blue-200"
  }

  return (
    <div className={`lg:w-150 w-full -mb-16 ${fileMeta && fileMeta.length > 0 ? '' : 'mt-4'} p-4 flex flex-col border-2 rounded-xl ${CLASS_NAMES[status?.type || 'info']}`}>
      <div className="flex justify-between items-center">
        <p>{status?.message}</p>
        {uploading && <span className="text-sm font-semibold">{status?.progress}%</span>}
      </div>
      {uploading && (
        <div className="mt-2 w-full">
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${status?.progress}%` }}
            />
          </div>
        </div>
      )}
      {status?.data && (
        <div className='bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mt-2 text-sm overflow-x-auto break-all'>
          <a href={status.data} target='_blank' rel='noreferrer' className='text-green-600 dark:text-green-600 hover:underline'>
            {status.data}
          </a>
        </div>
      )}
      {fileId && !uploading && type === 'success' && (
        <button
          onClick={() => copyLink()}
          className="mt-2 bg-blue-500 hover:bg-blue-700 text-white cursor-pointer font-bold py-2 px-4 rounded-lg transition"
        >
          {btnText || "Copy download link"}
        </button>
      )}
    </div>
  )
}

export default PopupStatus
