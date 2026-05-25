"use client"

import { PopupStatus } from "@/components"
import { faKey } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

const SecretPage = () => {
  const params = useParams()
  const id = params.id as string
  const [content, setContent] = useState<string>("")
  const [requiresPassword, setRequiresPassword] = useState<boolean | null>(null)
  const [password, setPassword] = useState<string>("")
  const [notif, setNotif] = useState<{ type: "success" | "error" | "info", message: string } | null>(null)
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
          setNotif({ type: "error", message: data.error || 'An error occurred while checking the secret.' })
          setTimeout(() => setNotif(null), 3000)
        }
      } catch (error) {
        console.error('Error checking secret:', error)
        setNotif({ type: "error", message: 'An unexpected error occurred while checking the secret.' })
        setTimeout(() => setNotif(null), 3000)
      } finally {
        setIsLoading(false)
      }
    }

    checkSecret()
  }, [id])

  const handleRetrieveSecret = async () => {
    try {
      setNotif(null)
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
        setNotif({ type: "error", message: data.error || 'An error occurred while retrieving the secret.' })
        setTimeout(() => setNotif(null), 3000)
      }

    } catch (error) {
      console.error('Error retrieving secret:', error)
      setNotif({ type: "error", message: 'An unexpected error occurred while retrieving the secret.' })
      setTimeout(() => setNotif(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    setNotif({ type: "success", message: "Secret copied to clipboard!" })
    setTimeout(() => setNotif(null), 3000)
  }

  return (
    <div className="my-auto">
      <h1 className="text-2xl font-bold text-center">Secret {requiresPassword ? "(Password Required)" : ""}</h1>
      {notif && (
        <PopupStatus
          type={notif.type}
          message={notif.message}
        />
      )}

      {!isLoading && requiresPassword === null && (
        <div className="mt-4 p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
          <p className="text-center text-zinc-500 dark:text-zinc-400">Secret not found. It may have been deleted, expired, or the link is incorrect.</p>
        </div>
      )}

      {!isLoading && requiresPassword !== null && (
        <div className="lg:w-150 w-full mt-4 flex flex-col border-zinc-200 dark:border-zinc-700 border-2 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-900 gap-4">
          <div className="w-full flex flex-col items-start gap-2">
            <div className={`p-4 rounded-md w-full min-h-14 ${content ? 'bg-[#f4f4f6] dark:bg-[#25272c]' : 'striped-bg'} text-zinc-700 dark:text-[#d2d5da] whitespace-pre-wrap break-all transition duration-300`}>
              {content}
            </div>

            {requiresPassword && (
              <div className="w-full flex flex-wrap items-center justify-between mt-2 gap-1">
                <label htmlFor="password" className="font-semibold">This secret is password protected.</label>
                <div className='w-full inputClass h-10 text-lg bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300'>
                  <FontAwesomeIcon icon={faKey} className='text-zinc-700 dark:text-[#d2d5da]' size='xs' />
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRetrieveSecret()}
                    className="outline-none w-full"
                  />
                </div>
              </div>
            )}

          </div>
          <button
            onClick={content ? copyToClipboard : handleRetrieveSecret}
            disabled={requiresPassword === null || (requiresPassword && !password)}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition"
          >
            {content ? "Copy Secret" : "Retrieve Secret"}
          </button>
        </div>)}

      {isLoading && (
        <div className="mt-4 p-6 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900 animate-pulse">
          <p className="text-center text-zinc-500 dark:text-zinc-400">Loading secret...</p>
        </div>
      )}
    </div>
  )
}

export default SecretPage
