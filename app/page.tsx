"use client"

import { useMultipartUpload } from '@/hooks/useMultipartUpload'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function Home() {
  const [maxDownloads, setMaxDownloads] = useState<number | null>(null)
  const [notifyEmail, setNotifyEmail] = useState<string>("")
  const [status, setStatus] = useState<{
    message: string
    data?: string | null
    type: "success" | "error" | "info"
    fileId?: string
  } | null>(null)

  const { upload, progress, uploading, reset } = useMultipartUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (uploading) return;

    acceptedFiles.forEach(async (file) => {
      reset();
      setStatus({ message: "Uploading file", type: "info" });

      const result = await upload(file, { maxDownloads, notifyEmail: notifyEmail || undefined });

      if (result) {
        setStatus({
          message: "File uploaded successfully!",
          type: "success",
          data: result.fileId,
          fileId: result.fileId,
        });
      } else {
        setStatus({ message: "Failed to upload file", type: "error" });
      }
    })

  }, [ upload, uploading, reset, maxDownloads, notifyEmail])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const copyLink = async () => {
    if (!status?.fileId) return
    const link = `${window.location.origin}/file/${status.fileId}`
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
      setStatus(prev => prev ? { ...prev, message: "Download link copied to clipboard!" } : null)
    } catch {
      setStatus(prev => prev ? { ...prev, message: "Failed to copy link", type: 'error' } : null)
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-black">
      <main className="flex flex-col w-full max-w-7xl items-center justify-center py-32 px-16">
        {(status || uploading) && (
          <div className={`lg:w-150 w-full -mt-20 mb-5 p-4 flex flex-col rounded-xl ${status?.type === 'success' ? 'bg-green-100 text-green-700' : status?.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            <p>{status?.message}</p>
            {uploading && (
              <div className="mt-2 w-full">
                <div className="flex justify-between text-xs mb-1 text-blue-600">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {status?.data && <pre className='bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mt-2 text-sm overflow-x-auto h-9'>{status.data}</pre>}
            {status?.fileId && (
              <button
                onClick={() => copyLink()}
                className="mt-2 bg-blue-500 hover:bg-blue-700 text-white cursor-pointer font-bold py-2 px-4 rounded-lg transition"
              >
                Copy download link
              </button>
            )}
          </div>
        )}

        <div className="lg:w-150 w-full mb-5 flex flex-col border-zinc-300 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-900 transition duration-300">
          <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Options</h2>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="option1" className="text-zinc-700 dark:text-zinc-300">Max downloads</label>
              <input
                type="number"
                id="option1"
                name="option1"
                className="h-8 text-lg outline-none bg-zinc-200 dark:bg-zinc-800 hover:border-blue-500 rounded-md px-2 text-zinc-700 dark:text-zinc-300 transition duration-300"
                value={maxDownloads ?? ''}
                onChange={(e) => setMaxDownloads(e.target.value ? Number.parseInt(e.target.value) : null)}
              />
            </div>

            <div className="flex flex-col col-span-2 gap-1">
              <label htmlFor="option2" className="text-zinc-700 dark:text-zinc-300">Notify me when file is downloaded</label>
              <input
                type="email"
                id="option2"
                name="option2"
                className="h-8 text-lg outline-none bg-zinc-200 dark:bg-zinc-800 hover:border-blue-500 rounded-md px-2 text-zinc-700 dark:text-zinc-300 transition duration-300"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="z-10 lg:w-150 w-full h-40 md:h-60 flex items-center justify-center border-zinc-300 dark:border-zinc-700 border-2 rounded-2xl cursor-pointer hover:border-blue-500 bg-zinc-50 dark:bg-zinc-900 transition duration-300">
          <div className='w-full h-full flex items-center justify-center' {...getRootProps()}>
            <input {...getInputProps()} />
            <p className="p-8 text-xl text-center text-zinc-700 dark:text-zinc-300">
              Drag and drop some files here, or click to select files
            </p>
          </div>
        </div>

        <div className='fixed bottom-2 text-center text-zinc-500 dark:text-zinc-400 z-0'>
            <h1 className="text-xl font-bold">CrabS3</h1>
            <p className="text-sm">No cloud. No bill. Just S3 buckets full of crabs. 🦀</p>
        </div>
      </main>
    </div>
  );
}
