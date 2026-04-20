"use client"

import { useParams } from "next/navigation"
import { useState } from "react"

export default function Id() {
  const params = useParams()
  const id = params.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadFile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/download/${id}`)
      if (!response.ok) {
        throw new Error("File not found")
      }

      const blob = await response.blob()

      let filename = "download"
      const contentDisposition = response.headers.get("Content-Disposition")
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) {
          filename = match[1]
        }
      }

      const url = globalThis.URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      globalThis.URL.revokeObjectURL(url)
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
