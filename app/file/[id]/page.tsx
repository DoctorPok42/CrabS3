"use client"

import { faCloudArrowDown } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
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
    hasPassword: boolean
    filename: string
    size: number
  } | null>(null)

  const downloadFile = async () => {
    setIsDownloading(true)
    setNotif(null)

    try {
      if (fileInfo?.hasPassword && password)
        setNotif({ type: "info", message: "Verifying password..." })

      const validationResponse = await fetch(`/api/download/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })
      if (validationResponse.status !== 200) {
        const errorData = await validationResponse.json()
        throw new Error(`Error: ${validationResponse.status} ${errorData.error || validationResponse.statusText}`)
      }

      let count = 0
      const interval = setInterval(() => {
        count += 1
        setNotif({ type: "info", message: "Downloading file" + ".".repeat(count % 4) })
      }, 500)

      const downloadResponse = await fetch(`/api/download/${id}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })
      if (downloadResponse.status !== 200) {
        const errorData = await downloadResponse.json()
        throw new Error(`Error: ${downloadResponse.status} ${errorData.error || downloadResponse.statusText}`)
      }

      const blob = await downloadResponse.blob()
      const contentDisposition = downloadResponse.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i)
      const filename = filenameMatch?.[1] || `download-${id}`

      const objectUrl = globalThis.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.URL.revokeObjectURL(objectUrl)
      setNotif({ type: "success", message: "File downloaded successfully!" })
      setTimeout(() => setNotif(null), 3000)
      clearInterval(interval)
    } catch (err) {
      console.error('Error downloading file:', err)
      setNotif({ type: "error", message: err instanceof Error ? err.message : "Failed to download file" })
      setTimeout(() => setNotif(null), 3000)
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    const checkFile = async () => {
      try {
        const response = await fetch(`/api/checkfile?fileId=${id}`)
        if (response.status !== 200) {
          throw new Error(`Error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setFileInfo(data)
      } catch (err) {
        console.error('Error checking file:', err)
        setNotif({ type: "error", message: err instanceof Error ? err.message : "Failed to check file" })
        setTimeout(() => setNotif(null), 3000)
      } finally {
        setIsLoading(false)
      }
    }

    checkFile()
  }, [id])

  return (
    <div className="flex flex-col items-center justify-center px-16 min-h-screen bg-white font-sans dark:bg-black">
      <h1 className="text-2xl font-bold text-center">
        Download File
      </h1>

      {!fileInfo?.exists && !isLoading ? (
        <div className="mt-4 p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
          <p className="text-center text-zinc-500 dark:text-zinc-400">File not found. It may have been deleted or the link is incorrect.</p>
        </div>
      ) : null}

      {fileInfo?.exists && (
        <div className="lg:w-150 w-full mt-4 flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-900 gap-4">
          <div className="flex flex-col items-start">
            <div className="flex gap-4 items-center justify-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FontAwesomeIcon size="2x" icon={faCloudArrowDown} className="text-blue-400" />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <span className="font-semibold truncate">{fileInfo.filename}</span>
                <span className="text-xs">{(fileInfo.size > 1024 * 1024 * 1024) ? (fileInfo.size / (1024 * 1024 * 1024)).toFixed(2) + " GB" : (fileInfo.size > 1024 * 1024) ? (fileInfo.size / (1024 * 1024)).toFixed(2) + " MB" : (fileInfo.size / 1024).toFixed(2) + " KB"}</span>
              </div>
            </div>
            {fileInfo.hasPassword && (
              <div className="w-full flex flex-wrap items-center justify-between">
                <p className="font-semibold">This file is password protected.</p>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && downloadFile()}
                  className="w-full h-8 text-lg outline-none bg-neutral-200 dark:bg-zinc-800 hover:border-blue-500 rounded-md px-2 text-zinc-700 dark:text-zinc-300 transition duration-300"
                />
              </div>
            )}
          </div>

          <button
            onClick={downloadFile}
            disabled={isLoading || !fileInfo || (fileInfo.hasPassword && !password) || isDownloading}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition"
          >
            Download File
          </button>
          {notif && (
            <div className={`p-4 rounded-lg ${notif.type === "error" ? "bg-red-100 text-red-700" : notif.type === "success" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {notif.message}
            </div>
          )}
        </div>
      )}

      <div className='mt-4 text-center text-zinc-500 dark:text-zinc-400'>
        <h1 className="text-xl font-bold">CrabS3</h1>
        <p className="text-sm">No cloud. No bill. Just S3 buckets full of crabs. 🦀</p>
      </div>
    </div>
  )
}
