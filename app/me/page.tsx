"use client"

import { Button, Input } from "@/components";
import ConfirmDialog, { ConfirmDialogProps } from "@/components/ConfirmDialog";
import Toast, { ToastProps } from "@/components/Toast";
import { formatDate } from "@/lib/format";
import { faCircleXmark, faEnvelope, faLevelUpAlt, faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQRCode } from "next-qrcode";
import { useCallback, useEffect, useState } from "react";

const Me = () => {
  const [user, setUser] = useState<{ id: string; email: string, name: string, isAdmin: boolean, twoFactorEnabled: boolean } | null>(null)
  const [editedName, setEditedName] = useState<string>("")
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [twoFactorSecret, setTwoFactorSecret] = useState<{ secret: string, uri: string } | null>(null)
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [confirmPopup, setConfirmPopup] = useState<ConfirmDialogProps | null>(null)
  const [accessTokens, setAccessTokens] = useState<Array<{ id: number, name: string, scopes: string[], expires_at: string, token: string | null }>>([])
  const [newAccessToken, setNewAccessToken] = useState<{ name: string, scope: string, expires_at: number }>({ name: "", scope: "", expires_at: 7 })
  const { Canvas } = useQRCode();

  const getAccessTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/accessToken', {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setAccessTokens(data.accessTokens);
      }
    } catch (error) {
      console.error("Error fetching access tokens:", error);
    }
  }, []);

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

    getAccessTokens();
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
        setTwoFactorSecret(null);
        setToast({ level: 'warning', message: 'Two-Factor Authentication has been disabled.' });
      } else {
        setToast({ level: 'error', message: 'Error disabling 2FA' });
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
      setToast({ level: 'error', message: 'Error enabling 2FA' })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'DELETE',
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        const error = await res.json();
        setToast({ level: 'error', message: error.error || 'Error deleting account' });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setToast({ level: 'error', message: 'Error deleting account' });
    }
  }

  const handleCreateAccessToken = async () => {
    setToast(null);

    if (!newAccessToken.name || !newAccessToken.scope || !newAccessToken.expires_at) {
      setToast({ level: 'error', message: 'Please fill in all fields to create an access token.' });
      return;
    }

    try {
      const res = await fetch('/api/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccessToken.name,
          scopes: [newAccessToken.scope],
          expires_at: newAccessToken.expires_at,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccessTokens(prev => [...prev, data.accessToken]);
        setNewAccessToken({ name: "", scope: "", expires_at: 7 });
        setToast({ level: 'success', message: 'Access token created successfully.' });
      } else {
        const error = await res.json();
        setToast({ level: 'error', message: error.error || 'Error creating access token' });
      }
    } catch (error) {
      console.error('Error creating access token:', error);
      setToast({ level: 'error', message: 'Error creating access token' });
    }
  }

  const handleDeleteAccessToken = async (tokenId: number) => {
    setToast(null);
    setConfirmPopup(null);

    try {
      const res = await fetch(`/api/accessToken?id=${tokenId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccessTokens(prev => prev.filter(token => token.id !== tokenId));
        setToast({ level: 'success', message: 'Access token deleted successfully.' });
      } else {
        const error = await res.json();
        setToast({ level: 'error', message: error.error || 'Error deleting access token' });
      }
    } catch (error) {
      console.error('Error deleting access token:', error);
      setToast({ level: 'error', message: 'Error deleting access token' });
    }
  }

  return (
    <div className="flex flex-col w-full max-w-8xl items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full mb-8 flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">My Account</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your account information and settings</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <Toast {...toast} />

      {twoFactorSecret && (
        <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 dark:bg-black/50 z-50">
          <div className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark p-6 rounded-2xl w-110">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">Two-Factor Authentication</h2>
              <Button
                onClick={() => { setTwoFactorSecret(null), setToast({ level: 'success', message: 'Two-Factor Authentication has been enabled!' }); }}
                icon={faCircleXmark}
                variant="ghost"
                divClass="text-xl! p-0!"
              />

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

      {confirmPopup && (
        <ConfirmDialog {...confirmPopup} />
      )}

      <div className="flex flex-col lg:flex-row w-full gap-6">
        <div className="w-3/7 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark transition duration-300">
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

            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Two-Factor Authentication (2FA)</h2>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Enhance the security of your account by enabling two-factor authentication.</p>

              <div className="flex mt-3">
                <Button
                  onClick={handleEnable2FA}
                  text={user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  variant={user?.twoFactorEnabled ? 'danger' : 'secondary'}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSaveProfile}
                text={isLoadingProfile ? 'Saving...' : 'Save changes'}
                variant="primary"
                disabled={isLoadingProfile || (!editedName.trim() || (newPassword && (newPassword.length < 8 || newPassword !== confirmPassword))) || (user?.name === editedName.trim() && !newPassword)}
              />

              <Button
                onClick={() => setConfirmPopup({
                  title: "Confirm Account Deletion",
                  message: "Are you sure you want to delete your account? This action cannot be undone.",
                  actions: [
                    {
                      label: "Cancel",
                      variant: "secondary",
                      onClick: () => setConfirmPopup(null),
                    },
                    {
                      label: "Delete",
                      variant: "danger",
                      onClick: handleDeleteAccount,
                    },
                  ],
                  onClose: () => setConfirmPopup(null),
                })}
                text="Delete account"
                variant="danger"
              />
            </div>
          </div>
        </div>

        <div className="w-4/7 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark transition duration-300">
          <div>
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Access Tokens</h2>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Generate and manage access tokens for API access.</p>
            <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
          </div>

          <div className="flex h-full flex-col gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="new-token-name"
                name="new-token-name"
                type="text"
                label="Token Name"
                value={newAccessToken.name}
                onChange={(e) => setNewAccessToken({ ...newAccessToken, name: e.target.value })}
                placeholder="Enter a name for the token"
                divClass="col-span-1!"
              />

              <div className="flex flex-col gap-1 col-span-1">
                <label htmlFor="option1" className="text-[#5b544f] dark:text-[#a59d97] text-[13px] tracking-[0.001em] font-semibold">Scope</label>
                <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
                  <FontAwesomeIcon icon={faLevelUpAlt} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
                  <select
                    id="option1"
                    name="option1"
                    className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
                    value={newAccessToken.scope}
                    onChange={(e) => setNewAccessToken({ ...newAccessToken, scope: e.target.value })}
                  >
                    <option value="" disabled>Select a scope</option>
                    <option value="READ">READ</option>
                    <option value="WRITE">WRITE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 col-span-1">
                <label htmlFor="option1" className="text-[#5b544f] dark:text-[#a59d97] text-[13px] tracking-[0.001em] font-semibold">Expire after (days)</label>
                <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
                  <FontAwesomeIcon icon={faLevelUpAlt} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
                  <select
                    id="option1"
                    name="option1"
                    className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
                    value={newAccessToken.expires_at}
                    onChange={(e) => setNewAccessToken({ ...newAccessToken, expires_at: Number(e.target.value) })}
                  >
                    <option value="7">7</option>
                    <option value="30">30</option>
                    <option value="90">90</option>
                    <option value="180">180</option>
                    <option value="365">365</option>
                  </select>
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleCreateAccessToken}
                  text="Create Token"
                  divClass="w-full"
                  disabled={!newAccessToken.name || !newAccessToken.scope || !newAccessToken.expires_at}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-cardBorder dark:border-cardBorder-dark">
                    <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Name</th>
                    <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Scopes</th>
                    <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Expires</th>
                    <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessTokens.map(token => (
                    <tr key={token.id} className="border-b border-cardBorder dark:border-cardBorder-dark">
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{token.name}</td>
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{token.scopes.join(", ")}</td>
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{formatDate(token.expires_at)}</td>
                      <td className="px-4 py-2 flex gap-2">
                        {token.token && (
                          <Button
                            onClick={() => navigator.clipboard.writeText(token.token!)}
                            text="Copy Token"
                            variant="secondary"
                          />
                        )}
                        <Button
                          onClick={() => setConfirmPopup({
                            title: "Confirm Token Deletion",
                            message: `Are you sure you want to delete the access token "${token.name}"? This action cannot be undone.`,
                            actions: [
                              {
                                label: "Cancel",
                                variant: "secondary",
                                onClick: () => setConfirmPopup(null),
                              },
                              {
                                label: "Delete",
                                variant: "danger",
                                onClick: () => handleDeleteAccessToken(token.id),
                              },
                            ],
                            onClose: () => setConfirmPopup(null),
                          })}
                          text="Delete"
                          variant="danger"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}

export default Me
