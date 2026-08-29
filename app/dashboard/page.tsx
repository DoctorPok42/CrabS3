"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAddressCard, faBug, faChevronLeft, faChevronRight, faFingerprint, faShareNodes, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { Button, Input, Toast, ConfirmDialog } from "@/components"
import { ConfirmDialogProps } from "@/components/ConfirmDialog"
import { formatSize } from "@/lib/format"

type DashboardFile = {
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
  folder: {
    id: string; name: string, shared_folders: string[] | null
  }
}

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<{
    files: DashboardFile[];
    isAdmin: boolean;
  } | null>(null)
  const [folderNameEdits, setFolderNameEdits] = useState<Record<string, string>>({})
  const [savingFolderId, setSavingFolderId] = useState<string>("")
  const [isEditingFolderName, setIsEditingFolderName] = useState<string | false>(false)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [type, setType] = useState<"active" | "expired">("active")
  const [fetchingReport, setFetchingReport] = useState<string>("")
  const [toast, setToast] = useState<{ message: string; level: 'info' | 'success' | 'warning' | 'error', actionLabel?: string } | null>(null)
  const [siblingDeletePrompt, setSiblingDeletePrompt] = useState<{
    fileId: string
    folderId: string
    siblingCount: number
    siblingFilenames: string[]
  } | null>(null)
  const [sharedPopupFolderId, setSharedPopupFolderId] = useState<string | null>(null)
  const [sharedPopupSelectedFolders, setSharedPopupSelectedFolders] = useState<Set<string>>(new Set())
  const [savingSharedFolders, setSavingSharedFolders] = useState<boolean>(false)
  const [allFolders, setAllFolders] = useState<Array<{ id: string; name: string; fileCount: number }> | null>(null)
  const sharedPopupRef = useRef<HTMLDivElement | null>(null)
  const [confirmPopup, setConfirmPopup] = useState<ConfirmDialogProps | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/files?page=${page}&limit=10&type=${type}`)
      if (!response.ok) {
        setToast({ message: 'Error fetching dashboard data', level: 'error' })
      }

      const fetchFoldersResponse = await fetch('/api/dashboard/folders')
      if (!fetchFoldersResponse.ok) {
        setToast({ message: 'Error fetching folders', level: 'error' })
      } else {
        const foldersData = await fetchFoldersResponse.json()
        setAllFolders(foldersData.folders)
      }

      const data = await response.json()
      setDashboardData(data)
      const nextFolderNames: Record<string, string> = {}
      if (!data.files || data.files?.length === 0) {
        setFolderNameEdits({})
        setTotalPages(0)
        return
      }

      for (const file of data.files as Array<{ folder_id: string | null; folder: { name: string } | null }>) {
        if (file.folder_id && !nextFolderNames[file.folder_id]) {
          nextFolderNames[file.folder_id] = file.folder?.name || file.folder_id
        }
      }
      setFolderNameEdits(nextFolderNames)
      setTotalPages(data.totalPages)
    } catch (error) {
      setToast({ message: 'Error fetching dashboard data', level: 'error' })
      console.error('Error fetching dashboard data:', error)
    }
  }, [page, type])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const deleteFile = async (fileId: string, folderId: string, mode?: "this" | "all") => {
    setToast({ message: '', level: 'info' })

    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, folderId, ...(mode && { mode }) })
      })

      if (response.status === 409) {
        const data = await response.json().catch(() => null)
        if (data?.needsConfirmation) {
          setSiblingDeletePrompt({
            fileId,
            folderId,
            siblingCount: data.siblingCount,
            siblingFilenames: data.siblingFilenames || [],
          })
          return
        }
      }

      if (!response.ok) {
        setToast({ message: 'Error deleting file', level: 'error' })
        return
      }

      const data = await response.json().catch(() => ({}))
      setSiblingDeletePrompt(null)
      await fetchDashboardData()
      setToast({
        message: data.removedCount > 1 ? `${data.removedCount} files deleted successfully` : 'File deleted successfully',
        level: 'success',
      })
    } catch (error) {
      setToast({ message: 'Error deleting file', level: 'error' })
      console.error('Error deleting file:', error)
    }
  }

  const handleChangeType = (newType: "active" | "expired") => {
    setType(newType)
    setPage(1)
  }

  const getFingerprintReport = async (id: string, type: "file" | "folder", name?: string) => {
    try {
      setFetchingReport(id)
      const response = await fetch(`/api/fingerprint/${id}?type=${type}`)
      if (!response.ok) {
        setToast({ message: 'Error fetching fingerprint report', level: 'error' })
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name || id}-${type}-fingerprint-report.json`
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
        setToast({ message: 'Error moving file to hot storage', level: 'error' })
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

      setToast({ message: 'File moved to hot storage successfully', level: 'success' })
    } catch (error) {
      setToast({ message: 'Error moving file to hot storage', level: 'error' })
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
        setToast({ message: 'Error renaming folder', level: 'error' })
      }

      setDashboardData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          files: prev.files.map(file => (
            file.folder_id === folderId
              ? { ...file, folder: file.folder ? { ...file.folder, name: nextName } : { id: folderId, name: nextName, shared_folders: null } }
              : file
          ))
        }
      })

      setFolderNameEdits(prev => ({ ...prev, [folderId]: nextName }))
      setIsEditingFolderName(false)
      setToast({ message: 'Folder renamed successfully', level: 'success' })
    } catch (error) {
      setToast({ message: 'Error renaming folder', level: 'error' })
      console.error('Error renaming folder:', error)
    } finally {
      setSavingFolderId("")
    }
  }

  const deleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/dashboard/folders/${folderId}?mode=permanent`, {
        method: "DELETE",
      })
      if (!response.ok) {
        if (response.status === 409) {
          const data = await response.json().catch(() => null)
          if (data?.needsConfirmation) {
            setSiblingDeletePrompt({
              fileId: data.fileId,
              folderId,
              siblingCount: data.siblingCount,
              siblingFilenames: data.siblingFilenames || [],
            })
            return
          }
        }
        setToast({ message: 'Error deleting folder', level: 'error' })
      }

      setDashboardData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          files: prev.files.filter(file => file.folder_id !== folderId)
        }
      })

      setToast({ message: 'Folder deleted successfully', level: 'success' })
    } catch (error) {
      setToast({ message: 'Error deleting folder', level: 'error' })
      console.error('Error deleting folder:', error)
    }
  }

  const openSharedPopup = (folderId: string, currentSharedIds: string[] | null | undefined) => {
    setSharedPopupSelectedFolders(new Set(currentSharedIds || []))
    setSharedPopupFolderId(folderId)
  }

  const toggleSharedFolder = (folderId: string) => {
    setSharedPopupSelectedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const saveSharedFolders = async () => {
    if (!sharedPopupFolderId) return
    setToast({ message: '', level: 'info' })

    try {
      setSavingSharedFolders(true)
      const response = await fetch(`/api/dashboard/folders/${sharedPopupFolderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedFolderIds: Array.from(sharedPopupSelectedFolders) }),
      })

      if (!response.ok) {
        setToast({ message: 'Error updating shared folders', level: 'error' })
        return
      }

      await fetchDashboardData()
      setToast({ message: 'Shared folders updated', level: 'success' })
      setSharedPopupFolderId(null)
    } catch (error) {
      setToast({ message: 'Error updating shared folders', level: 'error' })
      console.error('Error updating shared folders:', error)
    } finally {
      setSavingSharedFolders(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sharedPopupRef.current && !sharedPopupRef.current.contains(event.target as Node)) {
        setSharedPopupFolderId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sharedPopupRef])

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your uploaded files, view statistics, and security settings.</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <Toast
        message={toast?.message || ""}
        level={toast?.level || "info"}
        actionLabel={toast?.actionLabel || ""}
      />

      {sharedPopupFolderId && (() => {
        const otherFolders = allFolders?.filter(f => f.id !== sharedPopupFolderId) || []

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div ref={sharedPopupRef} className="bg-white dark:bg-zinc-900 rounded-xl p-6 pb-2 w-full max-w-lg">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Share Folder</h2>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">You can select the folders that are joined with this folder.</p>
              {otherFolders.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">You don&apos;t have any other folders to join this one with yet.</p>
              ) : (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto mb-5 -mx-1 px-1">
                  {otherFolders.map((f) => {
                    const folderName = f.name || f.id
                    const checked = sharedPopupSelectedFolders.has(f.id)

                    return (
                      <label
                        key={f.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] transition duration-150"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSharedFolder(f.id)}
                          className="w-4 h-4 accent-primary-500 cursor-pointer shrink-0 checked:bg-primary-500 checked:hover:bg-primary-600 checked:dark:bg-primary-400 checked:dark:hover:bg-primary-300"
                        />
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-300">{folderName}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{f.fileCount} file{f.fileCount === 1 ? '' : 's'}</span>
                      </label>
                    )
                  })}

                  <div className="flex gap-2 mt-4">
                    <Button text="Cancel" onClick={() => setSharedPopupFolderId(null)} variant="secondary" divClass="w-full" />
                    <Button
                      text={savingSharedFolders ? "Saving..." : "Save"}
                      onClick={saveSharedFolders}
                      disabled={savingSharedFolders}
                      divClass="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {confirmPopup && (
        <ConfirmDialog {...confirmPopup} />
      )}

      {siblingDeletePrompt && (
        <ConfirmDialog
          title="This file shares content with other files"
          message={
            `Deleting this file also affects ${siblingDeletePrompt.siblingCount} other file${siblingDeletePrompt.siblingCount > 1 ? 's' : ''} that share the exact same content` +
            (siblingDeletePrompt.siblingFilenames.length
              ? ` (${siblingDeletePrompt.siblingFilenames.join(', ')}${siblingDeletePrompt.siblingCount > siblingDeletePrompt.siblingFilenames.length ? ', …' : ''})`
              : '') +
            `.\n\n"Delete this file" only removes this one - the others keep working. "Delete all" removes every one of them.`
          }
          actions={[
            {
              label: 'Delete this file',
              variant: 'secondary',
              onClick: () => deleteFile(siblingDeletePrompt.fileId, siblingDeletePrompt.folderId, 'this'),
            },
            {
              label: `Delete all ${siblingDeletePrompt.siblingCount + 1} files`,
              variant: 'danger',
              onClick: () => deleteFile(siblingDeletePrompt.fileId, siblingDeletePrompt.folderId, 'all'),
            },
          ]}
          onClose={() => setSiblingDeletePrompt(null)}
        />
      )}

      <div className="w-full flex">
        <div className="flex p-1 gap-1 bg-input dark:bg-input-dark border border-cardBorder dark:border-cardBorder-dark rounded-full">
          <Button
            text="Active"
            onClick={() => handleChangeType("active")}
            variant={type === "active" ? "primary" : "ghost"}
          />
          <Button
            text="Expired"
            onClick={() => handleChangeType("expired")}
            variant={type === "expired" ? "primary" : "ghost"}
          />
        </div>
      </div>

      {dashboardData === null && (
        <div className="w-full max-w-2xl flex flex-col border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 bg-white dark:bg-zinc-900 transition duration-300">
          <p className="text-center text-zinc-600 dark:text-zinc-400">Loading your files...</p>
        </div>
      )}

      {
        dashboardData?.files && dashboardData.files.length > 0 && (
          <div className="w-full flex flex-col gap-6">
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
                <div key={folderId} className="flex flex-col border border-cardBorder dark:border-cardBorder-dark rounded-3xl p-6 bg-card dark:bg-card-dark transition duration-300">
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
                        <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-bold px-3 py-1.5 rounded-full">
                          <span>Protected</span>
                        </div>
                      )}

                      {folderFiles[0].infected && (
                        <div className="flex items-center text-sm font-bold px-3.5 py-1.5 rounded-full bg-[#f2e8d5] dark:bg-[#44310d] text-[#6a3200] dark:text-[#f7b83d]">
                          Infected
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        text="Delete Folder"
                        variant="danger"
                        onClick={() => setConfirmPopup({
                          title: "Delete Folder",
                          message: `Are you sure you want to delete the folder "${folderName}" and all its files? This action cannot be undone.`,
                          actions: [
                            {
                              label: "Cancel",
                              variant: "secondary",
                              onClick: () => setConfirmPopup(null),
                            },
                            {
                              label: "Delete",
                              variant: "danger",
                              onClick: () => deleteFolder(folderId)
                            },
                          ],
                          onClose: () => setConfirmPopup(null),
                        })}
                      />

                      <Button
                        icon={faShareNodes}
                        variant="secondary"
                        onClick={() => openSharedPopup(folderId, folderFiles[0].folder?.shared_folders || null)}
                      />

                      <Button
                        icon={fetchingReport === folderId ? faSpinner : faFingerprint}
                        onClick={() => getFingerprintReport(folderId, "folder", folderName)}
                        variant="secondary"
                        title="Get Fingerprint Report"
                      />

                      {isFolderExpired && (
                        <Button
                          text="Move to Hot Storage"
                          variant="secondary"
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
                            variant="secondary"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {folderFiles.map((file) => {
                      let bgClass = 'bg-[#f4f1ee] dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700'

                      if (file.infected) {
                        bgClass = 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                      }

                      return (
                        <div
                          key={file.id}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4 rounded-2xl transition duration-200 ${bgClass}`}
                        >
                          <div>
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 text-sm">
                              <p className="text-sm font-bold truncate">{file.filename}</p>
                              {file.infected && (
                                <span className="text-xs font-medium px-1.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                                  <FontAwesomeIcon icon={faBug} size="xs" />
                                </span>
                              )}
                              <span className="hidden lg:flex">•</span>
                              <span className="hidden lg:flex" title={formatSize(file.size)}>
                                {formatSize(file.size)}
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
                              onClick={() => getFingerprintReport(file.id, "file", file.filename)}
                              variant="secondary"
                            />

                            {!isFolderExpired && !file.infected && (
                              <Button
                                text="Delete"
                                variant="danger"
                                onClick={() => setConfirmPopup({
                                  title: "Delete File",
                                  message: `Are you sure you want to delete the file "${file.filename}"? This action cannot be undone.`,
                                  actions: [
                                    {
                                      label: "Cancel",
                                      variant: "secondary",
                                      onClick: () => setConfirmPopup(null),
                                    },
                                    {
                                      label: "Delete",
                                      variant: "danger",
                                      onClick: () => deleteFile(file.id, folderId)
                                    },
                                  ],
                                  onClose: () => setConfirmPopup(null),
                                })}
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
          <div className="flex h-10 items-center justify-center gap-4 mt-4">
            <Button
              icon={faChevronLeft}
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
            />
            <span className="text-zinc-700 dark:text-zinc-300  flex items-center">
              Page {page} of {Math.ceil((totalPages + 1) / 10)}
            </span>
            <Button
              icon={faChevronRight}
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil((totalPages + 1) / 10)}
            />
          </div>
        )
      }

      {
        dashboardData?.files && dashboardData?.files.length === 0 && (
          <div className="w-full max-w-xl flex flex-col border border-cardBorder dark:border-cardBorder-dark rounded-2xl p-6 bg-card dark:bg-card-dark transition duration-300 text-center">
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
              {type === "active" ? "You haven't uploaded any files yet." : "No expired files found."}
            </p>
            <Button
              text="Start uploading"
              onClick={() => window.location.href = '/'}
            />
          </div>
        )
      }
    </main >
  )
}

export default DashboardPage
