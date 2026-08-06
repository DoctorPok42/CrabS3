"use client"

import { Input } from "@/components";
import { faCircleXmark, faEnvelope, faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQRCode } from "next-qrcode";
import { useEffect, useState } from "react";

const Me = () => {
  const [user, setUser] = useState<{ id: string; email: string, name: string, isAdmin: boolean, twoFactorEnabled: boolean } | null>(null)
  const [editedName, setEditedName] = useState<string>("")
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [twoFactorSecret, setTwoFactorSecret] = useState<{ secret: string, uri: string } | null>(null)
  const { Canvas } = useQRCode();

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

  const handleEnable2FA = async () => {
    if (user?.twoFactorEnabled) {
      const response = await fetch('/api/2fa/disable', {
        method: 'GET',
      });

      if (response.ok) {
        setUser(prev => prev ? { ...prev, twoFactorEnabled: false } : null);
        alert('Two-Factor Authentication has been disabled.');
      } else {
        const error = await response.json();
        alert(error.error || 'Error disabling 2FA');
      }
      return;
    }

    const response = await fetch('/api/2fa/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email }),
    });

    if (response.ok) {
      const data = await response.json();
      setTwoFactorSecret(data);
      setUser(prev => prev ? { ...prev, twoFactorEnabled: true } : null);
    } else {
      const error = await response.json();
      alert(error.error || 'Error enabling 2FA');
    }
  }

  return (
    <div className="flex flex-col w-full max-w-8xl items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full mb-8 flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">My Account</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your account information and settings</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      {twoFactorSecret && (
        <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 dark:bg-black/50 z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-96">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">Two-Factor Authentication</h2>
              <div className="flex items-center justify-center cursor-pointer" onClick={() => setTwoFactorSecret(null)}>
                <FontAwesomeIcon icon={faCircleXmark} className="text-gray-700 dark:text-gray-300 scale-150 hover:text-gray-500 transition" />
              </div>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">Scan this QR code with your authenticator app to enable two-factor authentication for your account.</p>
            <div className="flex flex-col items-center justify-center gap-2">
              <Canvas
                text={twoFactorSecret.uri}
                options={{
                  errorCorrectionLevel: "H",
                  scale: 6,
                  quality: 0.8,
                }}
              />
              <p className="text-zinc-500 dark:text-zinc-400">
                Secret: <span className="font-mono bg-zinc-100 dark:bg-zinc-700 rounded px-2 py-1">{twoFactorSecret.secret}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="lg:w-150 w-full flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-white shadow-zinc-100 shadow dark:shadow-zinc-600 dark:bg-zinc-900 transition duration-300">
        {profileMessage && (
          <div className={`mb-4 p-4 rounded-lg text-sm font-medium ${profileMessage.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
            }`}>
            {profileMessage.text}
          </div>
        )}

        <div className="space-y-6">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            icon={faEnvelope}
            value={user?.email || ''}
            disabled
            readOnly
            placeholder="Email cannot be changed"
            onChange={() => { }}
          />

          <Input
            id="name"
            name="name"
            type="text"
            label="Name"
            icon={faUser}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            placeholder="Enter your name"
          />

          <Input
            id="new-password"
            name="new-password"
            type="password"
            label="New password (optional)"
            icon={faLock}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave empty to keep current password"
          />

          {newPassword && (
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              label="Confirm new password"
              icon={faLock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
          )}

          {/* 2FA */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Two-Factor Authentication (2FA)</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">Enhance the security of your account by enabling two-factor authentication.</p>
            <div className="flex gap-3">
              <button
                onClick={handleEnable2FA}
                className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 cursor-pointer"
              >
                {user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </div>

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
    </div >
  )
}

export default Me
