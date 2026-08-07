"use client"

import { Button, Input } from "@/components"
import Toast, { ToastProps } from "@/components/Toast"
import { faBug, faCircleXmark, faCloudArrowDown, faKey } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useQRCode } from "next-qrcode"
import Head from "next/head"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export default function Id() {
  const params = useParams()
  const id = params.id as string
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [password, setPassword] = useState<string>("")
  const [fileInfo, setFileInfo] = useState<{
    exists: boolean
    files: Array<{
      id: string
      hasPassword: boolean
      filename: string
      size: number
      maxDownloads: number | null
      downloadCount: number
      infectedBy: string | null
      scannedAt: Date | null
      expiresAt: Date | null
      folderName: string | null
    }>
  } | null>(null)
  const [qrcodePopup, setQrcodePopup] = useState<string | null>(null)
  const { Canvas } = useQRCode();
  const qrcodeRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<ToastProps | null>(null)

  const downloadFile = async (fileId?: string) => {
    setIsDownloading(true)
    setToast(null)

    try {
      if (fileInfo?.files[0]?.hasPassword && password)
        setToast({ level: "info", message: "Verifying password..." })

      let urlParams = ""
      if (fileId) {
        urlParams = `?fileId=${fileId}`
      } else if (fileInfo && fileInfo.files.length > 1) {
        urlParams = "?allFiles=true"
      } else if (fileInfo?.files.length === 1) {
        urlParams = `?fileId=${fileInfo.files[0].id}`
      }

      const validationResponse = await fetch(`/api/download/${id}${urlParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })
      if (validationResponse.status !== 200) {
        if (validationResponse.status === 410)
          return globalThis.location.reload()
        if (validationResponse.status === 401 || validationResponse.status === 403)
          throw new Error("Incorrect password")

        const errorData = await validationResponse.json()
        throw new Error(`Error: ${errorData.error || validationResponse.statusText}`)
      }

      const triggerDownload = (fId: string, filename: string, isZip = false) => {
        const link = document.createElement('a')
        link.href = `/api/download/${id}/stream?password=${encodeURIComponent(password)}${isZip ? "&allFiles=true" : `&fileId=${fId}`}`
        link.setAttribute('download', filename)
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      if (fileId) {
        const file = fileInfo?.files.find(f => f.id === fileId)
        if (file) {
          triggerDownload(fileId, file.folderName ? file.folderName : file.filename)
        }
      } else if (fileInfo && fileInfo.files.length > 1) {
        triggerDownload("", "files.zip", true)
      } else if (fileInfo?.files.length === 1) {
        const file = fileInfo.files[0]
        triggerDownload(file.id, file.folderName ? file.folderName : file.filename)
      }

      const isZip = !fileId && fileInfo && fileInfo.files.length > 1
      setToast({ level: "success", message: `${isZip ? "Archive" : "File"}${(fileId && fileInfo?.files.length === 1) ? '' : 's'} will start downloading shortly.` })
    } catch (err) {
      console.error('Error downloading file:', err)
      setToast({ level: "error", message: err instanceof Error ? err.message : "Failed to download file" })
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    const checkFile = async () => {
      try {
        const response = await fetch(`/api/checkfile?folderId=${id}`)
        if (response.status !== 200) {
          throw new Error(`Error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setFileInfo(data)
      } catch (err) {
        console.error('Error checking file:', err)
        setToast({ level: "error", message: err instanceof Error ? err.message : "Failed to check file" })
      } finally {
        setIsLoading(false)
      }
    }

    checkFile()
  }, [id, setFileInfo, setIsLoading])

  const handleQrCode = () => {
    const link = `${globalThis.location.origin}/file/${id}`
    setQrcodePopup(link)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qrcodeRef.current && !qrcodeRef.current.contains(event.target as Node)) {
        setQrcodePopup(null)
      }
    }

    if (qrcodePopup) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [qrcodePopup])

  return (
    <main className="my-auto w-full max-w-5xl flex flex-col items-center md:px-16 px-6">
      <Head>
        <title>Download File - {fileInfo?.files.length === 1 ? fileInfo.files[0].filename : 'Multiple Files'}</title>
      </Head>
      {!fileInfo?.exists && !isLoading ? (
        <div className="mt-4 p-6 border border-cardBorder dark:border-cardBorder-dark rounded-2xl bg-card dark:bg-card-dark">
          <p className="text-center text-zinc-500 dark:text-zinc-400">File not found. It may have been deleted or the link is incorrect.</p>
        </div>
      ) : null}

      <Toast {...toast} />

      {qrcodePopup && (
        <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 dark:bg-black/50 z-50">
          <div ref={qrcodeRef} className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark p-6 rounded-2xl shadow-lg w-96">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">QR Code</h2>
              <Button
                onClick={() => setQrcodePopup(null)}
                icon={faCircleXmark}
                variant="ghost"
                divClass="text-xl! p-0!"
              />
            </div>

            <p className="text-zinc-500 dark:text-zinc-400 mb-4">Scan this QR code to access the file.</p>
            <div className="flex items-center justify-center">
              <Canvas
                text={qrcodePopup}
                options={{
                  errorCorrectionLevel: "H",
                  scale: 6,
                  quality: 0.8,
                  margin: 5,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {fileInfo?.exists && (
        <div className="w-full mt-4 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-[28px] p-6 bg-card dark:bg-card-dark gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{fileInfo.files[0].folderName || `File${fileInfo.files.length > 1 ? 's' : ''} Available`}</h2>
            <div className="flex flex-wrap gap-x-2 gap-y-2 items-center font-bold">
              {!fileInfo.files[0].folderName &&
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{fileInfo.files.filter((f) => !f.infectedBy).length} file{fileInfo.files.filter((f) => !f.infectedBy).length > 1 ? 's' : ''} available</p>
              }

              <span className="bg-input dark:bg-input-dark text-text dark:text-text-dark px-3.5 py-1.5 rounded-full text-[12.5px]">
                Total Size: {fileInfo.files.reduce((acc, file) => acc + file.size, 0) > 1024 * 1024 * 1024
                  ? (fileInfo.files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
                  : fileInfo.files.reduce((acc, file) => acc + file.size, 0) > 1024 * 1024
                    ? (fileInfo.files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(1) + ' MB'
                    : (fileInfo.files.reduce((acc, file) => acc + file.size, 0) / 1024).toFixed(1) + ' KB'}
              </span>

              {fileInfo.files.some((f) => f.hasPassword) && (
                <span className="bg-[#f2e8d5] dark:bg-[#44310d] text-[#6a324b] dark:text-[#f7b833] px-3.5 py-1.5 rounded-full text-[12.5px]">
                  Password Protected
                </span>
              )}
              {fileInfo.files.some((f) => f.maxDownloads !== null) && (
                <span className="bg-input dark:bg-input-dark text-text dark:text-text-dark px-3.5 py-1.5 rounded-full text-[12.5px]">
                  {fileInfo.files[0].downloadCount} / {fileInfo.files[0].maxDownloads} downloads left
                </span>
              )}
              {fileInfo.files.some((f) => f.infectedBy !== null) && (
                <span className="text-[#a20519] bg-[#ffebe8]  px-3.5 py-1.5 rounded-full text-[12.5px] font-bold">
                  Infected: {fileInfo.files.find((f) => f.infectedBy !== null)?.infectedBy}
                </span>
              )}
              <span className="bg-[#f2e8d5] dark:bg-[#44310d] text-[#6a324b] dark:text-[#f7b833] px-3.5 py-1.5 rounded-full text-[12.5px]">
                Expires: {fileInfo.files[0].expiresAt ? Math.floor((new Date(fileInfo.files[0].expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'Never'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap w-full gap-2">
            <Button
              text={`Download ${fileInfo.files.length > 1 ? 'All Files' : 'File'}`}
              onClick={() => downloadFile()}
              disabled={isLoading || !fileInfo || (fileInfo.files.some((f) => f.hasPassword) && !password) || isDownloading}
            />
            <Button
              text="QR"
              onClick={() => handleQrCode()}
              variant="secondary"
              title="Generate QR Code"
            />
          </div>

          <div className="max-h-90 overflow-x-hidden w-full border border-[#e4e0dd] dark:border-[#302a26] rounded-2xl">
            <table className="w-full text-xs sm:text-sm">
              <tbody className="w-full">
                {fileInfo.files.map((file, index) => (
                  <tr
                    key={file.id}
                    className={`w-full flex justify-between items-center lg:table-row ${index < fileInfo.files.length - 1 && 'border-b border-[#e4e0dd] dark:border-[#302a26]'} hover:bg-zinc-100 dark:hover:bg-zinc-950 transition duration-200 ${file.infectedBy ? 'opacity-70' : ''}`}
                  >
                    <td className="lg:w-[85%] w-[70%] p-4 text-zinc-700 dark:text-zinc-200 font-semibold truncate" title={file.filename}>
                      {file.filename}
                      {file.infectedBy && (
                        <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                          <FontAwesomeIcon icon={faBug} />
                          Infected: {file.infectedBy}
                        </span>
                      )}
                    </td>
                    <td className="p-4 hidden lg:block truncate text-zinc-700 dark:text-zinc-200">
                      {file.size > 1024 * 1024 * 1024
                        ? (file.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
                        : file.size > 1024 * 1024
                          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                          : (file.size / 1024).toFixed(1) + ' KB'}
                    </td>
                    {fileInfo.files.length > 1 && <td className="px-2">
                      {(fileInfo.files.length > 1 && !file.infectedBy) && (
                        <Button
                          icon={faCloudArrowDown}
                          variant="primary"
                          divClass="m-0 p-0"
                          onClick={() => downloadFile(file.id)}
                          disabled={isLoading || !fileInfo || (fileInfo.files.some((f) => f.hasPassword) && !password) || isDownloading}
                        />
                      )}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {fileInfo.files.some((f) => f.hasPassword) && (
            <Input
              label="This file is password protected."
              id="password"
              type="password"
              name="password"
              placeholder="Enter password"
              value={password}
              icon={faKey}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && downloadFile()}
              divClass="w-full"
            />
          )}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 p-6 border border-cardBorder dark:border-cardBorder-dark rounded-2xl bg-card dark:bg-card-dark">
          <p className="text-zinc-500 dark:text-zinc-400">Loading file information...</p>
        </div>
      )}
    </main>
  )
}
