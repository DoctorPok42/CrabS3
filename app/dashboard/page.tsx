"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEnvelope, faUser, faLock, faShieldAlt, faClock, faCertificate, faKey } from "@fortawesome/free-solid-svg-icons"

const DashboardPage = () => {
  const [user, setUser] = useState<{ id: string; email: string, name: string, isAdmin: boolean } | null>(null)
  const [dashboardData, setDashboardData] = useState<{
    files: Array<{
      id: string;
      filename: string;
      content_type: string;
      size: number;
      uploaded_at: string;
      expires_at: string;
      download_count: number;
      max_downloads: number | null;
      password_hash: string | null;
      folder_id: string | null;
      email_sender: string | null;
      email_recipient: string | null;
    }>,
    isAdmin: boolean;
  } | null>(null)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard/files')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    fetchDashboardData()
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDeleteFile = async (fileId: string, folderId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, folderId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error deleting file')
      }

      setDashboardData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          files: prev.files.filter(file => file.id !== fileId)
        }
      })
      setProfileMessage({ type: 'success', text: 'File deleted successfully' })
    } catch (error) {
      console.error('Error deleting file:', error)
      setProfileMessage({ type: 'error', text: 'Error deleting file' })
    }
  }

  return (
    <main className="flex flex-col w-full max-w-7xl items-center px-4 sm:px-16 pt-10">
      <div className="w-full mb-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your uploaded files</p>
      </div>

      {(dashboardData && dashboardData.files.length > 0) ? (
        <div className="w-full flex flex-col gap-8 max-w-480">
          {Object.entries(
            dashboardData.files.reduce((acc, file) => {
              const folderId = file.folder_id || 'unknown'
              if (!acc[folderId]) acc[folderId] = []
              acc[folderId].push(file)
              return acc
            }, {} as Record<string, typeof dashboardData.files>)
          ).map(([folderId, folderFiles]) => {
            const isFileExpired = (file: typeof folderFiles[0]) => {
              const isDateExpired = new Date(file.expires_at) < new Date()
              const isDownloadLimitReached = file.max_downloads !== null && file.download_count >= file.max_downloads
              return isDateExpired || isDownloadLimitReached
            }

            const isFolderExpired = folderFiles.every(file => isFileExpired(file))
            const hasPassword = folderFiles[0]?.password_hash !== null
            const maxDownloads = folderFiles[0]?.max_downloads
            const downloadCount = folderFiles[0]?.download_count

            return (
              <div key={folderId} className="w-full flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Files & Settings</h3>
                    <div className="flex flex-wrap gap-3 items-center">
                      {hasPassword && (
                        <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <FontAwesomeIcon icon={faKey} size="xs" />
                          Password Protected
                        </span>
                      )}
                      {maxDownloads !== null ? (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <FontAwesomeIcon icon={faShieldAlt} size="xs" />
                          {downloadCount} / {maxDownloads} downloads left
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <FontAwesomeIcon icon={faShieldAlt} size="xs" />
                          Unlimited Downloads
                        </span>
                      )}
                      {isFolderExpired ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <FontAwesomeIcon icon={faClock} size="xs" />
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <FontAwesomeIcon icon={faCertificate} size="xs" />
                          Valid
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <details open={!isFolderExpired} className="w-full cursor-pointer">
                  <summary className="font-bold text-zinc-700 dark:text-zinc-300 mb-4">Manage Files</summary>
                  <div className="flex flex-col gap-3 mb-6">
                    <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Share Link</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${globalThis.location.origin}/file/${folderId}`}
                        className="flex-1 inputClass h-10 text-sm bg-[#fafafa] dark:bg-[#1c1d21] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-3 text-zinc-700! dark:text-[#d2d5da]! cursor-text"
                      />
                      {!isFolderExpired && (
                        <>
                          <button
                            onClick={() => {
                              const link = `${globalThis.location.origin}/file/${folderId}`
                              navigator.clipboard.writeText(link).catch(() => {
                                const textarea = document.createElement('textarea')
                                textarea.value = link
                                textarea.style.cssText = 'position:fixed;opacity:0'
                                document.body.appendChild(textarea)
                                textarea.select()
                                document.execCommand('copy')
                                document.body.removeChild(textarea)
                              })
                            }}
                            className='bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer'
                          >
                            Copy
                          </button>
                          <a
                            href={`/file/${folderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='bg-zinc-500 hover:bg-zinc-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer text-center'
                          >
                            Open
                          </a></>)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-6">
                    <h4 className="text-base font-bold text-zinc-700 dark:text-zinc-300">Files ({folderFiles.length})</h4>
                  </div>

                  <div className="overflow-x-auto w-full max-h-96 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Filename</th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Size</th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Uploaded</th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Expires</th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Downloads</th>
                          {!isFolderExpired && <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {folderFiles.map((file, index) => (
                          <tr
                            key={file.id}
                            className={`border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition duration-200 ${index % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'
                              }`}
                          >
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 font-medium truncate max-w-xs" title={file.filename}>
                              {file.filename}
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                              {formatBytes(file.size)}
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 whitespace-nowrap text-xs">
                              {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 whitespace-nowrap text-xs">
                              {new Date(file.expires_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200 whitespace-nowrap text-xs">
                              {file.download_count} {file.max_downloads ? `/ ${file.max_downloads}` : '/ ∞'}
                            </td>
                            {!isFolderExpired && (
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteFile(file.id, folderId)}
                                  className='text-red-500 hover:text-red-700 hover:underline font-medium cursor-pointer transition'
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      ) : dashboardData ? (
        <div className="w-full max-w-[120rem] flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-12 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300 text-center">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">You have not uploaded any files yet.</p>
          <Link href="/" className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition w-fit mx-auto">
            Start Uploading
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-[120rem] flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center">Loading your files...</p>
        </div>
      )}
    </main>
  )
}

export default DashboardPage
