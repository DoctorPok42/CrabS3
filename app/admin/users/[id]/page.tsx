"use client"

import { Button } from "@/components"
import PopupStatus, { PopupStatusProps } from "@/components/PopupStatus"
import Toast, { ToastProps } from "@/components/Toast"
import { faShieldAlt, faUser } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

const User = () => {
  const params = useParams()
  const id = params.id as string
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    createdAt: string;
    quota: string;
    totalFiles: number;
    activeFiles: number;
    totalSecrets: number;
    sizeUsed: number;
  } | null>(null)
  const [toast, setToast] = useState<ToastProps | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${id}`)
        if (response.ok) {
          const data = await response.json()
          setUser(data)
        } else {
          console.error("Failed to fetch user:", response.statusText)
          setToast({ level: "error", message: "Failed to fetch user information" })
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        setToast({ level: "error", message: "Error fetching user information" })
      }
    }
    fetchUser()
  }, [id])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE"
      })
      if (response.ok) {
        globalThis.location.href = "/admin/users"
      } else {
        setToast({ level: "error", message: "Failed to delete user. Please try again." })
        console.error("Failed to delete user:", response.statusText)
      }
    } catch (error) {
      setToast({ level: "error", message: "An error occurred while deleting the user. Please try again." })
      console.error("Error deleting user:", error)
    }
  }


  const handleResetPassword = async () => {
    const newPassword = prompt("Enter a new password for this user:")
    if (!newPassword) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPassword })
      })
      if (response.ok) {
        setToast({ level: "success", message: "Password reset successfully." })
      } else {
        setToast({ level: "error", message: "Failed to reset password. Please try again." })
        console.error("Failed to reset password:", response.statusText)
      }
    } catch (error) {
      setToast({ level: "error", message: "An error occurred while resetting the password. Please try again." })
      console.error("Error resetting password:", error)
    }
  }

  const handleEditQuota = async () => {
    const newQuota = prompt("Enter a new quota for this user (in MB, or -1 for unlimited):")
    if (!newQuota) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${id}/edit-quota`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ quota: Number(newQuota) })
      })
      if (response.ok) {
        setToast({ level: "success", message: "Quota updated successfully." })
      } else {
        setToast({ level: "error", message: "Failed to update quota. Please try again." })
        console.error("Failed to edit quota:", response.statusText)
      }
    } catch (error) {
      setToast({ level: "error", message: "An error occurred while updating the quota. Please try again." })
      console.error("Error editing quota:", error)
    }
  }

  return (
    <main className="flex flex-col w-full max-w-[100em] gap-8 items-center px-4 sm:px-16 pt-10 mx-auto min-h-screen">

      <Toast {...toast} />

      {user ? (
        <>
          <div className="mt-10 w-full flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white">
                <span className="text-2xl font-bold">{user.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">{user.name}</h1>
                <p className="text-zinc-500 dark:text-zinc-400">{user.email}</p>
              </div>
            </div>
            <div className="mb-2">
              {user.isAdmin ? (
                <span className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-semibold text-sm">
                  <FontAwesomeIcon icon={faShieldAlt} size="sm" />
                  Administrator
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full font-semibold text-sm">
                  <FontAwesomeIcon icon={faUser} size="sm" />
                  User
                </span>
              )}
            </div>
          </div>

          <div className="lg:w-150 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Files</h3>
              </div>
              <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-200">{user.totalFiles}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{user.activeFiles} active</p>
            </div>

            <div className="flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Secrets</h3>
              </div>
              <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-200">{user.totalSecrets}</p>
            </div>

            <div className="flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Size Used</h3>
              </div>
              <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-200">{(user.sizeUsed / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="lg:w-150 w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark transition duration-300">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">User Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-zinc-600 dark:text-zinc-400 text-sm">Name</p>
                <p className="text-zinc-700 dark:text-zinc-200">{user.name}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-zinc-600 dark:text-zinc-400 text-sm">Email</p>
                <p className="text-zinc-700 dark:text-zinc-200">{user.email}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-zinc-600 dark:text-zinc-400 text-sm">Created At</p>
                <p className="text-zinc-700 dark:text-zinc-200">{new Date(user.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-zinc-600 dark:text-zinc-400 text-sm">Quota</p>
                <p className="text-zinc-700 dark:text-zinc-200">{Number(user.quota) === -1 ? 'Unlimited' : `${user.quota} MB`}</p>
              </div>
            </div>
          </div>

          <div className="lg:w-150 w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark transition duration-300">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Admin Actions</h2>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                text="Edit Quota"
                onClick={handleEditQuota}
                variant="secondary"
              />

              <Button
                text="Reset Password"
                onClick={handleResetPassword}
                variant="danger"
              />

              <Button
                text="Delete User"
                onClick={handleDelete}
                variant="danger"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="lg:w-150 w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark">
          <p className="text-center text-zinc-500 dark:text-zinc-400">Loading user information...</p>
        </div>
      )}
    </main>
  )
}

export default User
