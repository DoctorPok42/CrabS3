"use client"

import { Button, Input } from "@/components"
import { faBug, faCircleXmark, faClockRotateLeft, faCloudArrowDown, faKey, faQrcode, faShieldAlt } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useQRCode } from "next-qrcode"
import Head from "next/head"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function Id() {
  const params = useParams()
  const id = params.id as string
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [notif, setNotif] = useState<{ type: "success" | "error" | "info", message: string } | null>(null)
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

  const downloadFile = async (fileId?: string) => {
    setIsDownloading(true)
    setNotif(null)

    try {
      if (fileInfo?.files[0]?.hasPassword && password)
        setNotif({ type: "info", message: "Verifying password..." })

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

      let count = 0
      const interval = setInterval(() => {
        count += 1
        const fileCount = fileId ? 1 : fileInfo?.files.length || 0
        const isZip = !fileId && fileInfo && fileInfo.files.length > 1
        setNotif({
          type: "info",
          message: `Downloading ${isZip ? "archive" : fileCount > 1 ? `${fileCount} files` : "file"}` + ".".repeat(count % 4)
        })
      }, 500)

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

      clearInterval(interval)
      const isZip = !fileId && fileInfo && fileInfo.files.length > 1
      setNotif({ type: "success", message: `${isZip ? "Archive" : "File"}${(fileId && fileInfo?.files.length === 1) ? '' : 's'} will start downloading shortly.` })
    } catch (err) {
      console.error('Error downloading file:', err)
      setNotif({ type: "error", message: err instanceof Error ? err.message : "Failed to download file" })
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
        setNotif({ type: "error", message: err instanceof Error ? err.message : "Failed to check file" })
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

  return (
    <main className="my-auto w-full max-w-7xl flex flex-col items-center md:px-16 px-6">
      <Head>
        <title>Download File - {fileInfo?.files.length === 1 ? fileInfo.files[0].filename : 'Multiple Files'}</title>
      </Head>
      <h1 className="text-2xl mt-10 font-bold text-center">
        Download File
      </h1>

      {!fileInfo?.exists && !isLoading ? (
        <div className="mt-4 p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
          <p className="text-center text-zinc-500 dark:text-zinc-400">File not found. It may have been deleted or the link is incorrect.</p>
        </div>
      ) : null}

      {qrcodePopup && (
        <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 dark:bg-black/50 z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-96">
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
                }}
              />
            </div>
          </div>
        </div>
      )}

      {fileInfo?.exists && (
        <div className="w-full mt-4 flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow-lg dark:shadow-zinc-600 dark:bg-zinc-900 gap-6">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{fileInfo.files[0].folderName || `File${fileInfo.files.length > 1 ? 's' : ''} Available`}</h2>
            <div className="flex flex-wrap gap-x-2 gap-y-2 items-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{fileInfo.files.filter((f) => !f.infectedBy).length} file{fileInfo.files.filter((f) => !f.infectedBy).length > 1 ? 's' : ''} available for download</p>
              <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full text-xs font-semibold">
                Total Size: {fileInfo.files.reduce((acc, file) => acc + file.size, 0) > 1024 * 1024 * 1024
                  ? (fileInfo.files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
                  : fileInfo.files.reduce((acc, file) => acc + file.size, 0) > 1024 * 1024
                    ? (fileInfo.files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2) + ' MB'
                    : (fileInfo.files.reduce((acc, file) => acc + file.size, 0) / 1024).toFixed(2) + ' KB'}
              </span>

              {fileInfo.files.some((f) => f.hasPassword) && (
                <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-semibold">
                  <FontAwesomeIcon icon={faKey} />
                  Password Protected
                </span>
              )}
              {fileInfo.files.some((f) => f.maxDownloads !== null) && (
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                  <FontAwesomeIcon icon={faShieldAlt} />
                  {fileInfo.files[0].downloadCount} / {fileInfo.files[0].maxDownloads} downloads left
                </span>
              )}
              {fileInfo.files.some((f) => f.infectedBy !== null) && (
                <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                  <FontAwesomeIcon icon={faBug} />
                  Infected: {fileInfo.files.find((f) => f.infectedBy !== null)?.infectedBy}
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-semibold">
                <FontAwesomeIcon icon={faClockRotateLeft} />
                Expires: {fileInfo.files[0].expiresAt ? Math.floor((new Date(fileInfo.files[0].expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'Never'}
              </span>
            </div>

          </div>

          <div className="flex w-full gap-2">
            <button
              onClick={() => downloadFile()}
              disabled={isLoading || !fileInfo || (fileInfo.files.some((f) => f.hasPassword) && !password) || isDownloading}
              className="w-[95%] bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg cursor-pointer transition"
            >
              Download {fileInfo.files.length > 1 ? 'All Files' : 'File'}
            </button>
            <button
              onClick={() => handleQrCode()}
              className="px-4 rounded-lg transition border-2 border-gray-500 bg-gray-100 dark:bg-zinc-800 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 cursor-pointer"
            >
              <FontAwesomeIcon icon={faQrcode} className="text-gray-700 dark:text-gray-300 scale-105" size='1x' />
            </button>
          </div>

          {notif && (
            <div
              className={`p-4 rounded-lg lg:text-left text-center ${notif.type === 'error'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : notif.type === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}
            >
              {notif.message}
            </div>
          )}

          <div className="max-h-90 overflow-x-hidden w-full border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    <FontAwesomeIcon icon={faCloudArrowDown} className="mr-2 text-zinc-500 dark:text-zinc-400" />
                    Filename
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 hidden lg:block">Size</th>
                  {fileInfo.files.length > 1 && <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Action</th>}
                </tr>
              </thead>
              <tbody className="w-full shadow-inner shadow-zinc-100 dark:shadow-zinc-700">
                {fileInfo.files.map((file, index) => (
                  <tr
                    key={file.id}
                    className={`w-full flex lg:table-row border-b border-zinc-200  dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition duration-200 ${index % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'
                      } ${file.infectedBy ? 'opacity-70' : ''}`}
                  >
                    <td className="lg:w-[85%] w-[70%] px-4 py-3 text-zinc-700 dark:text-zinc-200 font-medium truncate" title={file.filename}>
                      {file.filename}
                      {file.infectedBy && (
                        <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                          <FontAwesomeIcon icon={faBug} />
                          Infected: {file.infectedBy}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:block truncate text-zinc-700 dark:text-zinc-200">
                      {file.size > 1024 * 1024 * 1024
                        ? (file.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
                        : file.size > 1024 * 1024
                          ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
                          : (file.size / 1024).toFixed(2) + ' KB'}
                    </td>
                    {fileInfo.files.length > 1 && <td className="px-4 py-3 w-1/3">
                      {(fileInfo.files.length > 1 && !file.infectedBy) && (
                        <button
                          onClick={() => downloadFile(file.id)}
                          disabled={isLoading || !fileInfo || (fileInfo.files.some((f) => f.hasPassword) && !password) || isDownloading}
                          className="text-blue-500 hover:text-blue-700 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed font-medium cursor-pointer transition"
                        >
                          <span className="hidden lg:flex">Download</span>
                          <Button
                            icon={faCloudArrowDown}
                            variant="primary"
                            divClass="lg:hidden"
                            onClick={() => downloadFile(file.id)}
                          />
                        </button>
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
        <div className="mt-4 p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">Loading file information...</p>
        </div>
      )}
    </main>
  )
}
