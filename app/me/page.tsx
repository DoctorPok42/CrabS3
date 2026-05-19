"use client"

import { faEnvelope, faLock, faUser } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react";

const Me = () => {
  const [user, setUser] = useState<{ id: string; email: string, name: string, isAdmin: boolean } | null>(null)
  const [editedName, setEditedName] = useState<string>("")
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
  return (
    <div className="my-auto">
      <div className="lg:w-150 w-full flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
        <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">My Information</h2>

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
      </div>
    </div>
  )
}

export default Me
