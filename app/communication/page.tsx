"use client"

import { Input } from "@/components"
import { useEffect, useState } from "react"
import { faDiscord } from "@fortawesome/free-brands-svg-icons"

const Communication = () => {
  const [discordWebhookURL, setDiscordWebhookURL] = useState<string | null>(null)

  useEffect(() => {
    const fetchCommunicationSettings = async () => {
      try {
        const response = await fetch("/api/communication")
        if (!response.ok) {
          console.error("Failed to fetch communication settings")
          return
        }

        const data = await response.json()
        const discordCommunication = data?.communications?.find((comm: any) => comm.type === "discord")
        if (discordCommunication) {
          setDiscordWebhookURL(discordCommunication.url)
        }
      } catch (error) {
        console.error("Error fetching communication settings:", error)
      }
    }

    fetchCommunicationSettings()
  }, [])

  const handleSave = async () => {
    try {
      const payload = {
        webhook: [
          {
            type: "discord",
            url: discordWebhookURL,
          },
        ],
      }

      const response = await fetch("/api/communication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        console.error("Failed to save communication settings")
        return
      }
      alert("Communication settings saved successfully!")
    } catch (error) {
      console.error("Error saving communication settings:", error)
    }
  }

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">Communication</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage communication settings for your CrabS3 instance.</p>
        <hr className="border-zinc-200 dark:border-zinc-700 mt-4" />
      </div>

      <div className="w-full grid md:grid-cols-1 lg:grid-cols-4 gap-6 my-auto">
        <Input
          label="Discord URL"
          type="text"
          name="discordWebhookURL"
          id="discordWebhookURL"
          value={discordWebhookURL || ""}
          onChange={(e) => setDiscordWebhookURL(e.target.value)}
          placeholder="https://discord.com/api/webhooks/{webhook.id}/{webhook.token}"
          icon={faDiscord}
        />

        <button
          onClick={handleSave}
          disabled={!discordWebhookURL}
          className="col-span-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg cursor-pointer transition duration-200"
        >
          Save Settings
        </button>
      </div>
    </main>
  )
}

export default Communication
