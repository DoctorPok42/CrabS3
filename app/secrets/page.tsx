"use client"

import { useState } from "react"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClockRotateLeft, faEye, faKey } from "@fortawesome/free-solid-svg-icons"
import { Button, Input, PopupStatus } from "@/components"

const SecretPage = () => {
  const [secret, setSecret] = useState<string>("")
  const [maxSeen, setMaxSeen] = useState<number>(1)
  const [expireAfter, setExpireAfter] = useState<"1" | "7" | "14" | "21" | "30">("7")
  const [password, setPassword] = useState<string>("")
  const [uploading, setUploading] = useState<boolean>(false)
  const [popupStatus, setPopupStatus] = useState<{ message: string, type: "success" | "error" | "info", fileId?: string } | null>(null)

  const handleUpload = async () => {
    setUploading(true)
    try {
      setPopupStatus({ message: "Creating secret...", type: "info" })
      const response = await fetch("/api/secret/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: secret,
          maxViews: maxSeen,
          expiresAt: new Date(Date.now() + Number.parseInt(expireAfter) * 24 * 60 * 60 * 1000).toISOString(),
          password: password.trim() === "" ? null : password,
        })
      })
      const result = await response.json()
      setPopupStatus({
        message: `Secret created successfully!`,
        type: "success",
        fileId: result.id,
      })
    } catch (error) {
      setPopupStatus({ message: "Failed to create secret. Please try again.", type: "error" })
      setTimeout(() => setPopupStatus(null), 5000)
      console.error("Error uploading secret:", error)
    } finally {
      setUploading(false)
      setSecret("")
      setMaxSeen(1)
      setExpireAfter("7")
      setPassword("")
    }
  }

  return (
    <div className="my-auto w-full md:px-16 px-4 flex flex-col items-center justify-center transition duration-300">
      {popupStatus && (
        <PopupStatus
          message={popupStatus.message}
          type={popupStatus.type}
          fileId={popupStatus.fileId}
          uploading={uploading}
          btnText="Copy secret link"
          fileType="secret"
        />
      )}

      <div style={{ ['--shadow-color' as string]: '#f59e0baa' }} className={`inputShadow lg:w-150 w-full ${secret ? '' : 'mt-10'} h-[30vh] my-auto p-2 rounded-4xl flex items-center justify-center border-zinc-200 dark:border-zinc-700 border-2 cursor-pointer group hover:border-yellow-600 focus-within:border-yellow-600 bg-zinc-50 dark:bg-zinc-900 transition duration-250`}>
        <div className={`rounded-3xl w-full h-full flex items-center justify-center border-dashed border-zinc-200 dark:border-zinc-700 border-2 group-hover:border-yellow-500 dark:group-hover:border-yellow-800 focus-within:border-yellow-500 dark:focus-within:border-yellow-800 transition duration-250`}>
          <textarea
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter your secret here..."
            disabled={uploading}
            className={`w-full h-[95%] bg-transparent border-none focus:ring-0 m-2 pt-2 px-2 outline-none resize-none text-lg rounded-lg ${uploading ? 'cursor-not-allowed!' : 'cursor-text'} text-zinc-700 dark:text-zinc-300 transition duration-300`}
          />
        </div>
      </div>

      {
        secret && (
          <div className="lg:w-150 w-full mt-5 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 bg-card dark:bg-card-dark transition duration-300">
            <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Options</h2>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-rows-auto">
              <Input
                label="Max Seen Count"
                id="maxSeen"
                type="number"
                name="maxSeen"
                placeholder="e.g. 5"
                value={maxSeen}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value, 10)
                  if (!Number.isNaN(value) && value > 0) {
                    setMaxSeen(value)
                  } else {
                    setMaxSeen(1)
                  }
                }}
                icon={faEye}
              />

              <div className="flex flex-col gap-1 col-span-1 lg:col-span-2">
                <label htmlFor="option1" className="text-[#5b544f] dark:text-[#a59d97] text-[13px] tracking-[0.001em] font-semibold">Expire after (days)</label>
                <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
                  <FontAwesomeIcon icon={faClockRotateLeft} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
                  <select
                    id="option1"
                    name="option1"
                    className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
                    value={expireAfter}
                    onChange={(e) => setExpireAfter(e.target.value as "1" | "7" | "14" | "21" | "30")}
                  >
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="21">21 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
              </div>

              <Input
                label="Password (optional)"
                id="password"
                type="password"
                name="password"
                placeholder='Set a password to protect the secret'
                value={password}
                icon={faKey}
                onChange={(e) => setPassword(e.target.value)}
                divClass="md:col-span-2 lg:col-span-4"
              />
            </div>

            <div className="mt-4 flex">
              <Button
                text={uploading ? "Creating..." : "Create Secret"}
                onClick={handleUpload}
                disabled={uploading || secret.trim() === ""}
                divClass="flex-1"
              />
            </div>
          </div>
        )
      }

      <div className='flex flex-col items-center gap-2 mt-4 -mb-4'>
        <h2 className="text-md italic text-zinc-500 dark:text-zinc-400">Or send a file</h2>
        <Link href="/" className='text-sm py-2 px-4 rounded-full font-bold bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark text-zinc-800 dark:text-zinc-200 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 transition duration-150'>
          Send a File
        </Link>
      </div>
    </div >
  )
}

export default SecretPage
