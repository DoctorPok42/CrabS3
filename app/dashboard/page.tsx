"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEnvelope, faUser, faLock } from "@fortawesome/free-solid-svg-icons"

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
  const [editedName, setEditedName] = useState<string>("")
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setEditedName(data.name);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      }
    };

    fetchUser();
  }, [])

  useEffect(() => {
    if (profileMessage) {
      const timer = setTimeout(() => {
        setProfileMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [profileMessage])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleSaveProfile = async () => {
    setProfileMessage(null)
    if (!editedName.trim()) {
      setProfileMessage({ type: 'error', text: 'Name cannot be empty' })
      return
    }

    if (user?.name === editedName.trim() && !newPassword) {
      setProfileMessage({ type: 'error', text: 'No changes to save' })
      return
    }

    const updateData: { name: string; password?: string } = {
      name: editedName.trim(),
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setProfileMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
        return
      }
      if (newPassword !== confirmPassword) {
        setProfileMessage({ type: 'error', text: 'Passwords do not match' })
        return
      }
      updateData.password = newPassword
    }

    setIsLoadingProfile(true)
    try {
      const res = await fetch('/api/dashboard/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (res.ok) {
        const data = await res.json()
        setUser({ ...user!, name: data.user.name })
        setEditedName(data.user.name)
        setNewPassword("")
        setConfirmPassword("")
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' })
      } else {
        const error = await res.json()
        setProfileMessage({ type: 'error', text: error.error || 'Error updating profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setProfileMessage({ type: 'error', text: 'Error updating profile' })
    } finally {
      setIsLoadingProfile(false)
    }
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

      <div className="lg:w-150 w-full mb-8 flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
        <details>
          <summary className="text-lg font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">My Information</summary>

          {profileMessage && (
            <div className={`mb-4 p-4 rounded-lg text-sm font-medium ${profileMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
              } mt-4`}>
              {profileMessage.text}
            </div>
          )}

          <div className="space-y-6 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Email</label>
              <div className="inputClass h-10 text-base bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded-md px-2 text-zinc-500 dark:text-zinc-400 cursor-not-allowed flex items-center gap-2">
                <FontAwesomeIcon icon={faEnvelope} className='text-zinc-500 dark:text-zinc-400' size='sm' />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                  className="outline-none w-full bg-transparent"
                />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Email cannot be changed</span>
            </div>

            <div className="flex flex-col gap-2 -mt-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Name</label>
              <div className="inputClass h-10 text-base bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className='text-zinc-700 dark:text-[#d2d5da]' size='sm' />
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter your name"
                  className="outline-none w-full bg-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">New password (optional)</label>
              <div className="inputClass h-10 text-base bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 flex items-center gap-2">
                <FontAwesomeIcon icon={faLock} className='text-zinc-700 dark:text-[#d2d5da]' size='sm' />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to keep current password"
                  className="outline-none w-full bg-transparent"
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Minimum 8 characters</p>
            </div>

            {newPassword && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Confirm password</label>
                <div className="inputClass h-10 text-base bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 flex items-center gap-2">
                  <FontAwesomeIcon icon={faLock} className='text-zinc-700 dark:text-[#d2d5da]' size='sm' />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="outline-none w-full bg-transparent"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={isLoadingProfile || (!editedName.trim() || (newPassword && (newPassword.length < 8 || newPassword !== confirmPassword))) || (user?.name === editedName.trim() && !newPassword)}
                className="flex-1 bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-300 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoadingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </details>
      </div>

      {(dashboardData && dashboardData.files.length > 0) ? (
        <div className="lg:w-150 w-full flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
          <details open>
            <summary className="text-lg font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">Your File{dashboardData.files.length > 1 ? 's' : ''} ({dashboardData.files.length})</summary>

            <div className='space-y-3 mt-4'>
              {dashboardData.files.map(file => (
                <div key={file.id} className='flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition'>
                  <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-lg font-semibold text-zinc-700 dark:text-zinc-300 wrap-break-word'>{file.filename}</p>
                      <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>{formatBytes(file.size)}</p>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm'>
                    <div className='flex flex-col'>
                      <span className='text-zinc-500 dark:text-zinc-400 font-semibold'>Uploaded</span>
                      <span className='text-zinc-700 dark:text-zinc-300'>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      <span className='text-zinc-600 dark:text-zinc-400 text-xs'>{new Date(file.uploaded_at).toLocaleTimeString()}</span>
                    </div>

                    <div className='flex flex-col'>
                      <span className='text-zinc-500 dark:text-zinc-400 font-semibold'>Expires</span>
                      <span className='text-zinc-700 dark:text-zinc-300'>{new Date(file.expires_at).toLocaleDateString()}</span>
                      <span className='text-zinc-600 dark:text-zinc-400 text-xs'>{new Date(file.expires_at).toLocaleTimeString()}</span>
                    </div>

                    <div className='flex flex-col'>
                      <span className='text-zinc-500 dark:text-zinc-400 font-semibold'>Downloads</span>
                      <span className='text-zinc-700 dark:text-zinc-300'>{file.download_count} {file.max_downloads ? `/ ${file.max_downloads}` : '/ Unlimited'}</span>
                    </div>

                    <div className='flex flex-col'>
                      <span className='text-zinc-500 dark:text-zinc-400 font-semibold'>Protection</span>
                      <span className='text-zinc-700 dark:text-zinc-300'>{file.password_hash ? '🔒 Password' : '🔓 No password'}</span>
                    </div>
                  </div>

                  {(file.email_sender || file.email_recipient) && (
                    <div className='border-t border-zinc-200 dark:border-zinc-700 pt-3 text-sm'>
                      {file.email_sender && (
                        <p className='text-zinc-600 dark:text-zinc-400'><span className='font-semibold select-none mr-2'>Notify:</span>{file.email_sender}</p>
                      )}
                      {file.email_recipient && (
                        <p className='text-zinc-600 dark:text-zinc-400'><span className='font-semibold select-none mr-2'>Recipient:</span>{file.email_recipient}</p>
                      )}
                    </div>
                  )}

                  <div className='flex gap-2 pt-2 flex-wrap justify-between'>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.folder_id!)}
                      className='bg-zinc-600 hover:bg-red-700 text-white text-sm font-semibold cursor-pointer py-2 px-4 rounded-lg transition'
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        const link = `${globalThis.location.origin}/file/${file.folder_id}`
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
                      className='bg-blue-500 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer py-2 px-4 rounded-lg transition'
                    >
                      Copy Link
                    </button>
                    <Link
                      href={`/file/${file.folder_id}`}
                      target="_blank"
                      className='bg-zinc-500 hover:bg-zinc-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition'
                    >
                      Download
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : dashboardData ? (
        <div className="lg:w-150 w-full flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-12 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300 text-center">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">You have not uploaded any files yet.</p>
          <Link href="/" className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition w-fit mx-auto">
            Start Uploading
          </Link>
        </div>
      ) : (
        <div className="lg:w-150 w-full flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center">Loading your files...</p>
        </div>
      )}
    </main>
  )
}

export default DashboardPage
