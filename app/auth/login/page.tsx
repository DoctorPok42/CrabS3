"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setTimeout(() => setError(null), 3000)
        return
      }

      router.push("/")
    } catch {
      setError("Network error")
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          router.push("/")
        }
      })
  }, [router])

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 my-auto lg:-ml-69">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Welcome back</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Sign in to your account to manage your files
        </p>
      </div>

      <div className="flex flex-col gap-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-900">
        <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Sign in</h2>

        {error && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="your@email.com"
            className="h-9 outline-none bg-zinc-200 dark:bg-zinc-800 rounded-lg px-3 text-zinc-700 dark:text-zinc-300 transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="h-9 outline-none bg-zinc-200 dark:bg-zinc-800 rounded-lg px-3 text-zinc-700 dark:text-zinc-300 transition"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className="h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  )
}
