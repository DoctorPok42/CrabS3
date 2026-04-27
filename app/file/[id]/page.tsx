"use client"

import { useParams } from "next/navigation"
import { useState } from "react"

export default function Id() {
  const params = useParams()
  const id = params.id as string
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false)

  const downloadFile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setIsDownloaded(true)
      const response = await fetch(`/api/download/${id}`)
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
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
    } catch (err) {
      console.error('Error downloading file:', err)
      setError(err instanceof Error ? err.message : "Failed to download file")
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      {isDownloaded && (
        <div className="absolute p-10 flex flex-col rounded-2xl bg-zinc-100 dark:bg-zinc-800 shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Your download will start shortly...</h1>
          <p className="text-gray-600 text-center dark:text-gray-300">Find your file in your download folder.</p>
          <button onClick={() => setIsDownloaded(false)} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition">
            OK
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <button
          onClick={downloadFile}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition"
        >
          {isLoading ? "Downloading..." : "Download File"}
        </button>
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded">
            {error}
          </div>
        )}
      </div>

      <div className='absolute bottom-2 text-center text-zinc-500 dark:text-zinc-400'>
        <h1 className="text-xl font-bold">CrabS3</h1>
        <p className="text-sm">No cloud. No bill. Just S3 buckets full of crabs. 🦀</p>
      </div>
    </div>
  )
}
