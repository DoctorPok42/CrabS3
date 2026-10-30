"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@/components"

interface LoginFormProps {
  oidcEnabled: boolean
}

export default function LoginForm({ oidcEnabled }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [twoFactorToken, setTwoFactorToken] = useState("")

  useEffect(() => {
    const params = new URL(window.location.href).searchParams
    const oidcError = params.get("error")
    const messages: Record<string, string> = {
      access_denied: "SSO sign-in was cancelled.",
      signin_expired: "The SSO sign-in session expired. Please try again.",
      signin_failed: "SSO sign-in failed. Please try again.",
      idp_unreachable: "The SSO provider could not be reached. Please try again later.",
    }
    const message = oidcError ? messages[oidcError] : undefined

    if (message) {
      setError(message)
      params.delete("error")
      const cleanQuery = params.toString()
      window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`)
    }
  }, [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then(response => response.ok ? response.json() : null)
      .then(user => {
        if (user) window.location.href = "/"
      })
      .catch(() => undefined)
  }, [router])

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          twoFactorToken: twoFactorRequired ? twoFactorToken : undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.code === "2FA") {
          setTwoFactorRequired(true)
        } else {
          setError(data.error || "Login failed")
        }
        return
      }

      const next = new URL(window.location.href).searchParams.get("next")
      window.location.href = next || "/"
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && !!email && !!password && (!twoFactorRequired || !!twoFactorToken)

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

        {!twoFactorRequired ? (
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="your@email.com"
              autoFocus
            />
            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              value={password}
              placeholder="Enter your password"
              onChange={event => setPassword(event.target.value)}
              onKeyDown={event => event.key === "Enter" && canSubmit && handleSubmit()}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 loginAnimation">
            <Input
              label="2FA Token"
              id="twoFactorToken"
              name="twoFactorToken"
              type="number"
              value={twoFactorToken}
              onChange={event => setTwoFactorToken(event.target.value)}
              onKeyDown={event => event.key === "Enter" && canSubmit && handleSubmit()}
              placeholder="Enter your 2FA token"
              autoFocus
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Please enter your 2FA token to continue.
            </p>
          </div>
        )}

        <Button
          text={loading ? "Signing in..." : "Sign in"}
          onClick={handleSubmit}
          disabled={!canSubmit}
        />

        {oidcEnabled && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
              <div className="h-px flex-1 bg-cardBorder dark:bg-cardBorder-dark" />
              <span>OR</span>
              <div className="h-px flex-1 bg-cardBorder dark:bg-cardBorder-dark" />
            </div>
            <Button
              text="Continue with SSO"
              variant="secondary"
              onClick={() => {
                const next = new URL(window.location.href).searchParams.get("next")
                const query = next ? `?next=${encodeURIComponent(next)}` : ""
                window.location.href = `/api/auth/oidc/start${query}`
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
