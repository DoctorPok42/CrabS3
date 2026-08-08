"use client"

import { Button, Input, Toast } from "@/components"
import { ToastProps } from "@/components/Toast"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

const SecretPage = () => {
  const params = useParams()
  const id = params.id as string
  const [content, setContent] = useState<string>("")
  const [requiresPassword, setRequiresPassword] = useState<boolean | null>(null)
  const [password, setPassword] = useState<string>("")
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const checkSecret = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/secret/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ secretId: id })
        })
        const data = await response.json()

        if (response.status === 200) {
          setRequiresPassword(data.requiresPassword)
        } else if (response.status !== 404 && response.status !== 410) {
          setToast({ level: "error", message: data.error || 'An error occurred while checking the secret.' })
        }
      } catch (error) {
        console.error('Error checking secret:', error)
        setToast({ level: "error", message: 'An unexpected error occurred while checking the secret.' })
      } finally {
        setIsLoading(false)
      }
    }

    checkSecret()
  }, [id])

  const handleRetrieveSecret = async () => {
    try {
      const response = await fetch('/api/secret/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secretId: id, password })
      })
      const data = await response.json()
      if (response.status === 200) {
        setContent(data.content)
      } else {
        setToast({ level: "error", message: data.error || 'An error occurred while retrieving the secret.' })
      }

    } catch (error) {
      console.error('Error retrieving secret:', error)
      setToast({ level: "error", message: 'An unexpected error occurred while retrieving the secret.' })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    setToast({ level: "success", message: "Secret copied to clipboard!" })
  }

  return (
    <div className="my-auto">
      <h1 className="text-2xl font-bold text-center mb-2">Secret {requiresPassword ? "(Password Required)" : ""}</h1>

      <Toast {...toast} />

      {!isLoading && requiresPassword === null && (
        <div className="p-6 border border-cardBorder dark:border-cardBorder-dark rounded-2xl bg-card dark:bg-card-dark">
          <p className="text-center text-zinc-500 dark:text-zinc-400">Secret not found. It may have been deleted, expired, or the link is incorrect.</p>
        </div>
      )}

      {!isLoading && requiresPassword !== null && (
        <div className="lg:w-150 w-full mt-4 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark gap-4">
          <div className="w-full flex flex-col items-start gap-2">
            <div className={`p-4 rounded-xl w-full min-h-14 ${content ? 'bg-[#f4f4f6] dark:bg-[#25272c]' : 'striped-bg'} text-zinc-700 dark:text-[#d2d5da] whitespace-pre-wrap break-all transition duration-300`}>
              {content}
            </div>

            {requiresPassword && (
              <div className="w-full flex flex-wrap items-center justify-between mt-2 gap-1">
                <Input
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  autoFocus
                  divClass="flex-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRetrieveSecret()}
                />
              </div>
            )}

          </div>
          <Button
            text={content ? "Copy Secret" : "Retrieve Secret"}
            onClick={content ? copyToClipboard : handleRetrieveSecret}
            disabled={requiresPassword === null || (requiresPassword && !password)}
            divClass="flex-1"
          />
        </div>)}

      {isLoading && (
        <div className="mt-4 p-6 border border-cardBorder dark:border-cardBorder-dark rounded-2xl bg-card dark:bg-card-dark animate-pulse">
          <p className="text-center text-zinc-500 dark:text-zinc-400">Loading secret...</p>
        </div>
      )}
    </div>
  )
}

export default SecretPage
