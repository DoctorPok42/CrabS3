"use client"

import { Button, Input } from "@/components"
import Toast, { ToastProps } from "@/components/Toast"
import type { FolderInfo } from "@/lib/files"
import { formatSize } from "@/lib/format"
import { faBug, faCloudArrowDown, faKey } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useState } from "react"

const QrCodePopup = dynamic(() => import("@/components/QrCodePopup"), { ssr: false })

type Props = { id: string; initialFolder: FolderInfo }

export default function FileView({ id, initialFolder }: Readonly<Props>) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [password, setPassword] = useState<string>("")
  const [qrcodePopup, setQrcodePopup] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastProps | null>(null)

  const needsPassword = initialFolder.files.some((f: { hasPassword: boolean }) => f.hasPassword)

  const downloadFile = async (fileId?: string) => {
    setIsDownloading(true)
    setToast(null)

    try {
      if (needsPassword && password)
        setToast({ level: "info", message: "Verifying password..." })

      let urlParams = ""
      if (fileId) {
        urlParams = `?fileId=${fileId}`
      } else if (initialFolder.files.length > 1) {
        urlParams = "?allFiles=true"
      } else if (initialFolder.files.length === 1) {
        urlParams = `?fileId=${initialFolder.files[0].id}`
      }

      const validationResponse = await fetch(`/api/download/${id}${urlParams}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (validationResponse.status !== 200) {
        if (validationResponse.status === 410) return router.refresh()
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
        link.remove()
      }

      if (fileId) {
        const file = initialFolder.files.find((f: { id: string }) => f.id === fileId)
        if (file) triggerDownload(fileId, file.folderName ? file.folderName : file.filename)
      } else if (initialFolder.files.length > 1) {
        triggerDownload("", "files.zip", true)
      } else if (initialFolder.files.length === 1) {
        const file = initialFolder.files[0]
        triggerDownload(file.id, file.folderName ? file.folderName : file.filename)
      }

      const isZip = !fileId && initialFolder.files.length > 1
      setToast({ level: "success", message: `${isZip ? "Archive" : "File"}${(fileId && initialFolder.files.length === 1) ? '' : 's'} will start downloading shortly.` })
    } catch (err) {
      console.error('Error downloading file:', err)
      setToast({ level: "error", message: err instanceof Error ? err.message : "Failed to download file" })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleQrCode = () => setQrcodePopup(`${globalThis.location.origin}/file/${id}`)

  const heading = initialFolder.files[0].folderName || `File${initialFolder.files.length > 1 ? 's' : ''} available`

  return (
    <div className="my-auto w-full max-w-5xl flex flex-col items-center md:px-16 px-6">
      <Toast {...toast} />

      {qrcodePopup && <QrCodePopup link={qrcodePopup} onClose={() => setQrcodePopup(null)} />}

      {initialFolder.files.some((f: { folder: { shared_folders: { id: string; name: string | null }[] | null } }) => f.folder.shared_folders && f.folder.shared_folders.length > 0) && (
        <div className="w-full flex flex-col gap-2 mb-4 justify-center items-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-semibold">This folder is a part of shared folders.</p>
          <div className="flex flex-wrap gap-2">
            {initialFolder.files.find((f: { folder: { shared_folders: { id: string; name: string | null }[] | null } }) => f.folder.shared_folders && f.folder.shared_folders.length > 0)?.folder.shared_folders?.map(({ id, name }) => (
              <Button
                key={id}
                text={name || id}
                onClick={() => router.push(`/file/${id}`)}
                variant="secondary"
                title={`Go to shared folder ${id}`}
                divClass="select-none"
              />
            ))}
          </div>
        </div>
      )}

      <section
        aria-labelledby="file-heading"
        className="w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-[28px] p-6 bg-card dark:bg-card-dark gap-4"
      >
        <div className="flex flex-col gap-2">
          <h1 id="file-heading" className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{heading}</h1>
          <div className="flex flex-wrap gap-x-2 gap-y-2 items-center font-bold">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {initialFolder.files.filter((f: { infectedBy: string | null }) => !f.infectedBy).length} file{initialFolder.files.filter((f: { infectedBy: string | null }) => !f.infectedBy).length > 1 ? 's' : ''} available
            </p>

            <span className="bg-input dark:bg-input-dark text-text dark:text-text-dark px-3.5 py-1.5 rounded-full text-[12.5px]">
              Total Size: {formatSize(initialFolder.files.reduce((acc: number, file: { size: number }) => acc + file.size, 0))}
            </span>

            {initialFolder.files.some((f: { maxDownloads: number | null }) => f.maxDownloads !== null) && (
              <span className="bg-input dark:bg-input-dark text-text dark:text-text-dark px-3.5 py-1.5 rounded-full text-[12.5px]">
                {initialFolder.files[0].downloadCount} / {initialFolder.files[0].maxDownloads} downloads used
              </span>
            )}

            {initialFolder.files.some((f: { infectedBy: string | null }) => f.infectedBy !== null) && (
              <span className="text-[#a20519] bg-[#ffebe8] px-3.5 py-1.5 rounded-full text-[12.5px] font-bold">
                Infected: {initialFolder.files.find((f: { infectedBy: string | null }) => f.infectedBy !== null)?.infectedBy}
              </span>
            )}

            {needsPassword && (
              <span className="bg-[#f2e8d5] dark:bg-[#44310d] text-[#6a324b] dark:text-[#f7b833] px-3.5 py-1.5 rounded-full text-[12.5px]">
                Password Protected
              </span>
            )}

            <span className="bg-[#f2e8d5] dark:bg-[#44310d] text-[#6a324b] dark:text-[#f7b833] px-3.5 py-1.5 rounded-full text-[12.5px]">
              Expires: {initialFolder.files[0].expiresAt ? Math.floor((new Date(initialFolder.files[0].expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'Never'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap w-full gap-2">
          <Button
            text={`Download ${initialFolder.files.length > 1 ? 'All Files' : 'File'}`}
            onClick={() => downloadFile()}
            disabled={(needsPassword && !password) || isDownloading}
          />
          <Button text="QR" onClick={handleQrCode} variant="secondary" title="Generate QR Code" />
        </div>

        <div className="max-h-90 overflow-x-hidden w-full border border-[#e4e0dd] dark:border-[#302a26] rounded-2xl">
          <table className="w-full text-xs sm:text-sm">
            <caption className="sr-only">Files available in this share link</caption>
            <tbody className="w-full">
              {initialFolder.files.map((file: { id: string, filename: string, size: number, infectedBy: string | null }, index: number) => (
                <tr
                  key={file.id}
                  className={`w-full flex justify-between items-center lg:table-row ${index < initialFolder.files.length - 1 && 'border-b border-[#e4e0dd] dark:border-[#302a26]'} hover:bg-zinc-100 dark:hover:bg-zinc-950 transition duration-200 ${file.infectedBy ? 'opacity-70' : ''}`}
                >
                  <td className="lg:w-[85%] w-[70%] p-4 text-zinc-700 dark:text-zinc-200 font-semibold truncate" title={file.filename}>
                    {file.filename}
                    {file.infectedBy && (
                      <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                        <FontAwesomeIcon icon={faBug} aria-hidden="true" />
                        Infected: {file.infectedBy}
                      </span>
                    )}
                  </td>
                  <td className="p-4 hidden lg:block truncate text-zinc-700 dark:text-zinc-200">
                    {formatSize(file.size)}
                  </td>
                  {initialFolder.files.length > 1 && <td className="px-2">
                    {!file.infectedBy && (
                      <Button
                        icon={faCloudArrowDown}
                        variant="primary"
                        divClass="m-0 p-0"
                        title={`Download ${file.filename}`}
                        onClick={() => downloadFile(file.id)}
                        disabled={(needsPassword && !password) || isDownloading}
                      />
                    )}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {needsPassword && (
          <Input
            label="This file is password protected."
            id="password"
            type="password"
            name="password"
            placeholder="Enter password"
            value={password}
            autoFocus
            icon={faKey}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && downloadFile()}
            divClass="w-full"
          />
        )}
      </section>
    </div>
  )
}
