"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@/components"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false)
  const [twoFactorToken, setTwoFactorToken] = useState<string>("")

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, twoFactorToken: twoFactorRequired ? twoFactorToken : undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "2FA") {
          setTwoFactorRequired(true)
          return
        }
        setError(data.error || "Login failed")
        setTimeout(() => setError(null), 3000)
        return
      }

      window.location.href = "/"
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
          window.location.href = "/"
        }
      })
  }, [router])

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 my-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Welcome back</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Sign in to your account to manage your files
        </p>
      </div>

      <div className="flex flex-col gap-4 border border-cardBorder dark:border-cardBorder-dark rounded-2xl p-6 bg-card dark:bg-card-dark overflow-hidden">
        <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Sign in</h2>

        {error && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">{error}</div>
        )}

        {!twoFactorRequired ? <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              value={password}
              placeholder="Enter your password"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div> : (
          <div className="flex flex-col gap-4 loginAnimation">
            <div className="flex flex-col gap-1">
              <Input
                label="2FA Token"
                id="twoFactorToken"
                name="twoFactorToken"
                type="number"
                value={twoFactorToken}
                onChange={e => setTwoFactorToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Enter your 2FA token"
              />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Please enter your 2FA token to continue.</p>
          </div>
        )}

        <Button
          text={loading ? "Signing in…" : "Sign in"}
          onClick={handleSubmit}
          disabled={loading || !email || !password || (twoFactorRequired && !twoFactorToken)}
        />
      </div>
    </div>
  )
}
