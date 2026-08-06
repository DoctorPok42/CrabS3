"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAddressCard, faBug, faCheckCircle, faFingerprint, faKey, faSpinner, faTimesCircle } from "@fortawesome/free-solid-svg-icons"
import { Button, Input } from "@/components"

const DashboardPage = () => {
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
      infected: boolean;
      infected_by: string | null;
      scanned_at: string | null;
      storage: "hot" | "cold";
      folder: { id: string; name: string } | null;
    }>,
    isAdmin: boolean;
  } | null>(null)
  const [folderNameEdits, setFolderNameEdits] = useState<Record<string, string>>({})
  const [savingFolderId, setSavingFolderId] = useState<string>("")
  const [isEditingFolderName, setIsEditingFolderName] = useState<string | false>(false)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [type, setType] = useState<"active" | "expired">("active")
  const [fetchingReport, setFetchingReport] = useState<string>("")

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`/api/dashboard/files?page=${page}&limit=10&type=${type}`)
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const data = await response.json()
        setDashboardData(data)
        const nextFolderNames: Record<string, string> = {}
        for (const file of data.files as Array<{ folder_id: string | null; folder: { name: string } | null }>) {
          if (file.folder_id && !nextFolderNames[file.folder_id]) {
            nextFolderNames[file.folder_id] = file.folder?.name || file.folder_id
          }
        }
        setFolderNameEdits(nextFolderNames)
        setTotalPages(data.totalPages)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    fetchDashboardData()
  }, [page, type])

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
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const handleChangeType = (newType: "active" | "expired") => {
    setType(newType)
    setPage(1)
  }

  const getFingerprintReport = async (id: string, type: "file" | "folder") => {
    try {
      setFetchingReport(id)
      const response = await fetch(`/api/fingerprint/${id}?type=${type}`)
      if (!response.ok) {
        throw new Error('Failed to fetch fingerprint report')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${id}-${type}-fingerprint-report.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('Error fetching fingerprint report:', error)
      return null
    } finally {
      setFetchingReport("")
    }
  }

  const moveFileToHotStorage = async (fileId: string, folderId: string) => {
    try {
      const response = await fetch('/api/dashboard/coldtohot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      })

      if (!response.ok) {
        const error = await response.json()
        alert('Error moving file to hot storage')
        throw new Error(error.error || 'Error moving file to hot storage')
      }

      setDashboardData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          files: prev.files.map(file => {
            if (file.id === fileId) {
              return { ...file, storage: "hot" }
            }
            return file
          })
        }
      })
    } catch (error) {
      console.error('Error moving file to hot storage:', error)
    }
  }

  const saveFolderName = async (folderId: string, currentName: string) => {
    const nextName = (folderNameEdits[folderId] ?? currentName).trim()
    if (!nextName || nextName === currentName) return

    try {
      setSavingFolderId(folderId)
      const response = await fetch(`/api/dashboard/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to rename folder")
      }

      setDashboardData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          files: prev.files.map(file => (
            file.folder_id === folderId
              ? { ...file, folder: file.folder ? { ...file.folder, name: nextName } : { id: folderId, name: nextName } }
              : file
          ))
        }
      })

      setFolderNameEdits(prev => ({ ...prev, [folderId]: nextName }))
      setIsEditingFolderName(false)
    } catch (error) {
      console.error('Error renaming folder:', error)
    } finally {
      setSavingFolderId("")
    }
  }

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your uploaded files, view statistics, and security settings.</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <div className="p-1 flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-sm font-medium max-w-6xl">
        <div className={`px-12 py-1 font-bold cursor-pointer transition rounded-sm ${type === "active" && "bg-teal-500 text-white"}`} onClick={() => handleChangeType("active")}>
          Active
        </div>
        <div className={`px-12 py-1 font-bold cursor-pointer transition rounded-sm ${type === "expired" && "bg-teal-500 text-white"}`} onClick={() => handleChangeType("expired")}>
          Expired
        </div>
      </div>

      {dashboardData === null && (
        <div className="w-full max-w-2xl flex flex-col border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 bg-white dark:bg-zinc-900 transition duration-300">
          <p className="text-center text-zinc-600 dark:text-zinc-400">Loading your files...</p>
        </div>
      )}

      {
        dashboardData && dashboardData.files.length > 0 && (
          <div className="w-full flex flex-col gap-6 max-w-6xl">
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

              const folderName = folderFiles[0]?.folder?.name || folderId

              const isFolderExpired = folderFiles.every(file => isFileExpired(file))
              const hasPassword = folderFiles[0]?.password_hash !== null

              return (
                <div key={folderId} className="flex flex-col shadow-lg dark:shadow-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 bg-white dark:bg-zinc-900 transition duration-300">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-4">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isFolderExpired) {
                            setIsEditingFolderName(folderId === isEditingFolderName ? false : folderId)
                          }
                        }}
                        className="text-left text-lg font-semibold text-zinc-900 dark:text-zinc-100 hover:underline hover:text-blue-500 cursor-pointer"
                      >
                        {folderId === 'unknown' ? 'Ungrouped Files' : folderName} | {folderFiles.length} file{folderFiles.length === 1 ? '' : 's'}
                      </button>
                      {(isEditingFolderName === folderId && folderId !== 'unknown') && (
                        <div className="flex flex-wrap items-end gap-2 w-full max-w-md">
                          <Input
                            label="Folder name"
                            id={`folder-name-${folderId}`}
                            type="text"
                            name={`folder-name-${folderId}`}
                            value={folderNameEdits[folderId] ?? folderName}
                            onChange={(e) => setFolderNameEdits(prev => ({ ...prev, [folderId]: e.target.value }))}
                            icon={faAddressCard}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveFolderName(folderId, folderName)
                              }
                            }}
                          />

                          <Button
                            text={savingFolderId === folderId ? "Saving..." : "Save"}
                            variant="secondary"
                            onClick={() => saveFolderName(folderId, folderName)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {hasPassword && (
                        <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium px-3 py-1.5 rounded-lg">
                          <FontAwesomeIcon icon={faKey} size="xs" />
                          <span>Protected</span>
                        </div>
                      )}
                      <div className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-lg ${isFolderExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                        <FontAwesomeIcon icon={isFolderExpired ? faTimesCircle : faCheckCircle} size="xs" className="mr-1" />
                        {isFolderExpired ? 'Expired' : 'Active'}
                      </div>
                      {folderFiles[0].infected && (
                        <div className="flex items-center text-sm font-medium px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                          <FontAwesomeIcon icon={faBug} size="xs" className="mr-1" />
                          Infected
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        icon={fetchingReport === folderId ? faSpinner : faFingerprint}
                        onClick={() => getFingerprintReport(folderId, "folder")}
                        variant="secondary"
                      />

                      {isFolderExpired && (
                        <Button
                          text="Move to Hot Storage"
                          variant="primary"
                          onClick={() => moveFileToHotStorage(folderFiles[0].id, folderId)}
                        />
                      )}
                      {!isFolderExpired && (
                        <div className="flex gap-2">
                          <Button
                            text="Copy Link"
                            onClick={() => {
                              const link = `${globalThis.location.origin}/file/${folderId}`
                              navigator.clipboard.writeText(link).catch(() => {
                                console.error('Error copying link')
                              })
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {folderFiles.map((file) => {
                      const isExpired = isFileExpired(file)
                      let bgClass = 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'

                      if (isExpired) {
                        bgClass = 'opacity-50 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                      } else if (file.infected) {
                        bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                      }

                      return (
                        <div
                          key={file.id}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border transition duration-200 ${bgClass}`}
                        >
                          <div>
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 text-sm">
                              <p className="text-sm font-medium truncate">{file.filename}</p>
                              {file.infected && (
                                <span className="text-xs font-medium px-1.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                                  <FontAwesomeIcon icon={faBug} size="xs" />
                                </span>
                              )}
                              <span className="hidden lg:flex">•</span>
                              <span className="hidden lg:flex" title={formatBytes(file.size)}>
                                {formatBytes(file.size)}
                              </span>
                              {file.max_downloads && (
                                <>
                                  <span className="hidden lg:flex">•</span>
                                  <span className="hidden lg:flex" title={`${file.download_count}/${file.max_downloads} downloads`}>
                                    {file.download_count}/{file.max_downloads} downloads
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 flex gap-3">
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              icon={(fetchingReport === file.id || fetchingReport === folderId) ? faSpinner : faFingerprint}
                              onClick={() => getFingerprintReport(file.id, "file")}
                              variant="secondary"
                            />

                            {!isFolderExpired && !file.infected && (
                              <Button
                                text="Delete"
                                variant="danger"
                                onClick={() => handleDeleteFile(file.id, folderId)}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {
        totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`cursor-pointer px-3 py-1 rounded-md ${page === num ? 'bg-blue-500 text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'}`}
              >
                {num}
              </button>
            ))}
          </div>
        )
      }

      {
        dashboardData?.files.length === 0 && (
          <div className="w-full max-w-2xl flex flex-col border border-zinc-200 dark:border-zinc-700 rounded-xl p-12 bg-white dark:bg-zinc-900 transition duration-300 text-center">
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">You haven&apos;t uploaded any files yet.</p>
            <Link href="/" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition w-fit mx-auto">
              Start uploading
            </Link>
          </div>
        )
      }
    </main >
  )
}

export default DashboardPage
