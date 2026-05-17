"use client"

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const Menu = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<{ name: string, isAdmin: boolean } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      globalThis.location.href = "/auth/login"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (!user) return (
    <div className="fixed top-5 lg:right-5 z-50">
      <div className="flex items-center gap-3 shadow-lg shadow-zinc-300 dark:shadow-zinc-900 rounded-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600">
        <span className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">Loading...</span>
      </div>
    </div>
  )

  return (
    <div className="fixed top-5 right-5 z-50" ref={userMenuRef}>
      <div className="relative">
        <div className="flex items-center gap-3 shadow-lg shadow-zinc-300 dark:shadow-zinc-900 rounded-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600">
          {user ? (
            <>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-80 transition focus:outline-none"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {userMenuOpen && (
                <div
                  className="absolute top-full right-0 mt-2 bg-white dark:bg-zinc-700 rounded-lg shadow-lg shadow-zinc-300 dark:shadow-zinc-900 border border-zinc-200 dark:border-zinc-600 py-2 min-w-max"
                >
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-600">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Logged in as</span>
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{user.name}</span>
                    </div>
                  </div>
                  {(globalThis.location.pathname !== '/' && globalThis.location.pathname !== '/secret') && (
                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Upload Files
                    </Link>
                  )}
                  {globalThis.location.pathname !== '/dashboard' && (
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>)}
                  {user.isAdmin && globalThis.location.pathname !== '/admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setUserMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </>
          ) : loading ? (
            <span className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">Loading...</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Menu
