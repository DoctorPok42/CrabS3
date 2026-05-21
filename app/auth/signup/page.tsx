"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }

    fetch(`/api/auth/check-invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setTokenValid(true)
          setInviteEmail(data.email)
        } else {
          setTokenValid(false)
          setError(data.error || "Invalid or expired invitation")
          setTimeout(() => setError(null), 3000)
        }
      })
      .catch(() => setTokenValid(false))
  }, [token])

  const handleSubmit = async () => {
    if (password !== confirm) { setError("Passwords don't match"); setTimeout(() => setError(null), 3000); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); setTimeout(() => setError(null), 3000); return; }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      })

      const data = await res.json()

      if (!res.ok) { setError(data.error || "Signup failed"); setTimeout(() => setError(null), 3000); return; }

      router.push("/")
    } catch {
      setError("Network error")
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === false) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4 text-center my-auto lg:-ml-69">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Invitation Error</h1>
        <div className="border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6">
          <p className="text-zinc-500 dark:text-zinc-400">
            Please ask the administrator to send you a new invite or contact support if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  if (tokenValid === null) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400 my-auto lg:-ml-69">Verifying invitation…</p>
    )
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 my-auto lg:-ml-69">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Welcome</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Create your account to start sharing files
        </p>
      </div>

      <div className="flex flex-col gap-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-900">
        <div>
          <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Sign up</h2>
          {inviteEmail && (
            <p className="text-sm text-zinc-500 mt-1">
              Invited as <span className="font-medium text-blue-500">{inviteEmail}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-100 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="John Doe"
            className="h-9 outline-none bg-zinc-200 dark:bg-zinc-800 rounded-lg px-3 text-zinc-700 dark:text-zinc-300 transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="h-9 outline-none bg-zinc-200 dark:bg-zinc-800 rounded-lg px-3 text-zinc-700 dark:text-zinc-300 transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            className="h-9 outline-none bg-zinc-200 dark:bg-zinc-800 rounded-lg px-3 text-zinc-700 dark:text-zinc-300 transition"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !name || !password || !confirm || password !== confirm || password.length < 8}
          className="h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
