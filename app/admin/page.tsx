"use client"

import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFile, faEnvelope, faUser, faHdd, faDownload, faTrash, faShieldAlt, faDatabase, faLock, faRulerVertical, faShield } from "@fortawesome/free-solid-svg-icons"
import { StorageMetricCard } from "@/components/StorageMetricCard"
import { Button, Input } from "@/components"
import Toast, { ToastProps } from "@/components/Toast"

interface User {
  id: string
  email: string
  name: string | null
  isAdmin: boolean
  totalSize: number
  activeFiles: number
  totalFiles: number
  totalSecrets: number
  quota: number
  status: "active" | "pending"
}

interface AdminStats {
  totalStorageUsed: number
  expiredStorageSize: number
  coldStorageActive: boolean
  totalFiles: number
  activeFiles: number
  averageFileSize: number
  filesWithPassword: number
  totalUsers: number
  usersWithFiles: number
  totalSecrets: number
  totalDownloads: number
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [statsLoading, setStatsLoading] = useState<boolean>(true)
  const [emailInvite, setEmailInvite] = useState<string>("")
  const [toast, setToast] = useState<ToastProps | null>(null)

  useEffect(() => {
    const fetchUsersDash = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          if (!data.isAdmin) {
            window.location.href = "/"
            return
          }

          setUsers(data.allUsers)
        }
      } catch (error) {
        console.error("Failed to fetch users:", error)
      } finally {
        setLoading(false)
      }
    }

    const fetchStats = async () => {
      setStatsLoading(true)
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchUsersDash()
    fetchStats()
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const sendInvite = async () => {
    if (!emailInvite) return
    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInvite }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invite')
      }

      setEmailInvite("")
      setToast({ level: 'success', message: 'Invitation sent successfully!' })
    } catch (error: any) {
      console.error('Error sending invite:', error)
      setToast({ level: 'error', message: `Error: ${error.message}` })
    }
  }

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 items-center px-4 sm:px-16 pt-10 mx-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Admin Panel</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage users and storage statistics.</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <Toast {...toast} />

      <div className="w-full flex flex-col">
        <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-4">Storage Overview</h2>
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {new Array(9).fill(0).map((_, i) => (
              <StorageMetricCard
                key={i + 1}
                title="Loading..."
                value="0"
                subtitle="loading..."
                loading={true}
              />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <StorageMetricCard
              title="Total Storage Used (Hot + Cold)"
              value={formatBytes(stats.totalStorageUsed)}
              icon={faHdd}
              subtitle={`${formatBytes(stats.totalStorageUsed - (stats.expiredStorageSize))}`}
            />
            <StorageMetricCard
              title="Expired Storage Size"
              value={formatBytes(stats.expiredStorageSize)}
              icon={faTrash}
              subtitle="Awaiting cleanup"
            />
            <StorageMetricCard
              title="Cold Storage"
              value={stats.coldStorageActive ? "Active" : "Inactive"}
              icon={faDatabase}
              subtitle="S3 bucket status"
            />
            <StorageMetricCard
              title="Average File Size"
              value={formatBytes(stats.averageFileSize)}
              icon={faRulerVertical}
              subtitle="Per file"
            />
            <StorageMetricCard
              title="Total Downloads"
              value={stats.totalDownloads}
              icon={faDownload}
              subtitle="All time"
            />
            <StorageMetricCard
              title="Total Users"
              value={stats.totalUsers}
              icon={faUser}
              subtitle={`${stats.usersWithFiles} with files`}
            />
            <StorageMetricCard
              title="Total Files"
              value={stats.totalFiles}
              icon={faFile}
              subtitle={`${stats.activeFiles} active`}
            />
            <StorageMetricCard
              title="Files Protected"
              value={stats.filesWithPassword}
              icon={faShieldAlt}
              subtitle="With password"
            />
            <StorageMetricCard
              title="Secrets Shared"
              value={stats.totalSecrets}
              icon={faLock}
            />
          </div>
        )}
      </div>

      <div className="w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-3xl p-5.5 bg-card dark:bg-card-dark transition duration-300">
        <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Invite a user</h2>
        <p className="text-[13.5px] text-zinc-600 dark:text-zinc-400 mb-4">Send an invitation by email.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex w-full gap-2.5 items-end">
            {!loading && <Input
              label="Email"
              type="email"
              id="emailInvite"
              name="emailInvite"
              placeholder='new-user@example.com'
              icon={faEnvelope}
              value={emailInvite}
              onChange={(e) => setEmailInvite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sendInvite()
                }
              }}
              divClass="w-full"
            />}

            <Button
              text="Send"
              onClick={sendInvite}
              disabled={!emailInvite}
            />
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-3xl p-5.5 bg-card dark:bg-card-dark transition duration-300">
        <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-4">Users</h2>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 w-full">
                <th className="text-left px-2 sm:px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-1 text-zinc-500 dark:text-zinc-400 flex sm:hidden w-4" />
                  Email</th>
                <th className="text-left px-2 sm:px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  <FontAwesomeIcon icon={faUser} className="mr-1 text-zinc-500 dark:text-zinc-400 flex sm:hidden w-4" />
                  Name</th>
                <th className="text-left px-2 sm:px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  <FontAwesomeIcon icon={faShieldAlt} className="mr-1 text-zinc-500 dark:text-zinc-400 flex sm:hidden w-4" />
                  Status</th>
                <th className="text-left px-2 sm:px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  <FontAwesomeIcon icon={faFile} className="mr-1 text-zinc-500 dark:text-zinc-400 flex sm:hidden w-4" />
                  Files</th>
                <th className="text-left px-2 sm:px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  <FontAwesomeIcon icon={faShield} className="mr-1 text-zinc-500 dark:text-zinc-400 flex sm:hidden w-4" />
                  Secrets</th>
                <th className="text-left px-2 sm:px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                  <FontAwesomeIcon icon={faHdd} className="mr-1 text-zinc-500 dark:text-zinc-400 flex sm:hidden w-4" />
                  Storage</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                new Array(6).fill(0).map((_, index) => (
                  <tr key={index} className={`border-b border-zinc-200 dark:border-zinc-700 animate-pulse ${index % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'}`}>
                    <td className="px-2 sm:px-4 py-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div></td>
                    <td className="px-2 sm:px-4 py-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"></div></td>
                    <td className="px-2 sm:px-4 py-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div></td>
                    <td className="px-2 sm:px-4 py-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div></td>
                    <td className="px-2 sm:px-4 py-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/5"></div></td>
                    <td className="px-2 sm:px-4 py-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4"></div></td>
                  </tr>
                ))
              ) : users.length > 0 && (
                users.map((u, index) => (
                  <tr
                    key={u.id}
                    onClick={() => globalThis.location.href = `/admin/users/${u.id}`}
                    className={`border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition duration-200 cursor-pointer ${index % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'}`}
                  >
                    <td className="px-2 sm:px-4 py-3 text-zinc-700 dark:text-zinc-200 text-xs font-semibold">{u.email}</td>
                    <td className="px-2 sm:px-4 py-3 text-zinc-700 dark:text-zinc-200 text-xs">{u.name || '-'}</td>
                    <td className="px-2 sm:px-4 py-3">
                      {u.status === "pending" ? (
                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                          Pending
                        </span>
                      ) : u.isAdmin ? (
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-semibold">
                          Admin
                        </span>
                      ) : (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm">{u.activeFiles}/{u.totalFiles}</td>
                    <td className="px-2 sm:px-4 py-3 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm">{u.totalSecrets || 0}</td>
                    <td className="px-2 sm:px-4 py-3 text-zinc-700 dark:text-zinc-200 font-semibold text-xs sm:text-sm">{formatBytes(u.totalSize) + " / " + (u.quota === -1 ? "Unlimited" : formatBytes(u.quota))}</td>
                  </tr>
                ))
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 sm:px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

export default Admin
