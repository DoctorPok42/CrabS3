"use client"

import { Button, Input } from "@/components"
import { useCallback, useEffect, useState } from "react"
import { faDiscord, faMicrosoft, faSlack } from "@fortawesome/free-brands-svg-icons"
import Toast, { ToastProps } from "@/components/Toast"

const Communication = () => {
  const [discordWebhookURL, setDiscordWebhookURL] = useState<string | null>(null)
  const [slackWebhookURL, setSlackWebhookURL] = useState<string | null>(null)
  const [teamsWebhookURL, setTeamsWebhookURL] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [latestCommunicationLogs, setLatestCommunicationLogs] = useState<Array<{ id: string; type: string; title: string; status: number; created_at: Date }>>([])

  const getLatestCommunicationLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/communication/latest")
      if (!response.ok) {
        if (response.status === 404) {
          setLatestCommunicationLogs([])
          return
        }
        setToast({ level: "error", message: "Failed to fetch latest communication logs" })
        console.error("Failed to fetch latest communication logs")
        return
      }

      const data = await response.json()
      setLatestCommunicationLogs(data)
    } catch (error) {
      console.error("Error fetching latest communication logs:", error)
      setToast({ level: "error", message: "Error fetching latest communication logs" })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getLatestCommunicationLogs()
  }, [getLatestCommunicationLogs])

  useEffect(() => {
    const fetchCommunicationSettings = async () => {
      try {
        const response = await fetch("/api/communication")
        if (!response.ok) {
          setToast({ level: "error", message: "Failed to fetch communication settings" })
          console.error("Failed to fetch communication settings")
          return
        }

        const data = await response.json()
        const discordCommunication = data?.communications?.find((comm: { type: string }) => comm.type === "discord")
        const slackCommunication = data?.communications?.find((comm: { type: string }) => comm.type === "slack")
        const teamsCommunication = data?.communications?.find((comm: { type: string }) => comm.type === "teams")
        if (discordCommunication) {
          setDiscordWebhookURL(discordCommunication.url)
        }
        if (slackCommunication) {
          setSlackWebhookURL(slackCommunication.url)
        }
        if (teamsCommunication) {
          setTeamsWebhookURL(teamsCommunication.url)
        }
      } catch (error) {
        console.error("Error fetching communication settings:", error)
        setToast({ level: "error", message: "Error fetching communication settings" })
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
          {
            type: "slack",
            url: slackWebhookURL,
          },
          {
            type: "teams",
            url: teamsWebhookURL,
          }
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
        setToast({ level: "error", message: "Failed to save communication settings" })
        console.error("Failed to save communication settings")
      } else {
        setToast({ level: "success", message: "Communication settings saved successfully" })
      }
    } catch (error) {
      console.error("Error saving communication settings:", error)
      setToast({ level: "error", message: "Error saving communication settings" })
    }
  }

  const handleTestCommunication = async (type: string, url: string | null) => {
    if (!url) {
      setToast({ level: "error", message: `No ${type} webhook URL provided` })
      return
    }

    try {
      const payload = {
        type,
      }

      const response = await fetch("/api/communication/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        setToast({ level: "error", message: `Failed to send test communication for ${type}` })
        console.error(`Failed to send test communication for ${type}`)
      } else {
        setToast({ level: "success", message: `Test communication sent successfully for ${type}` })
      }
    } catch (error) {
      console.error("Error sending test communication:", error)
      setToast({ level: "error", message: "Error sending test communication" })
    }
  }

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Communication</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Notification settings for your instance.</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <Toast {...toast} />

      <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
        <div className="lg:w-1/2 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 gap-6 bg-card dark:bg-card-dark transition duration-300">
          <div>
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Notification channels</h2>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Send alerts to your team&apos;s tools via webhook.</p>
            <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
          </div>

          <div className="flex items-end gap-4">
            <Input
              label="Discord URL"
              type="text"
              name="discordWebhookURL"
              id="discordWebhookURL"
              value={discordWebhookURL || ""}
              onChange={(e) => setDiscordWebhookURL(e.target.value)}
              placeholder="https://discord.com/api/webhooks/{webhook.id}/{webhook.token}"
              icon={faDiscord}
              divClass="flex-1"
            />

            <Button
              text="Test"
              onClick={() => handleTestCommunication("discord", discordWebhookURL)}
              disabled={!discordWebhookURL}
              divClass="mt-2"
            />
          </div>

          <div className="flex items-end gap-4">
            <Input
              label="Slack URL"
              type="text"
              name="slackWebhookURL"
              id="slackWebhookURL"
              value={slackWebhookURL || ""}
              onChange={(e) => setSlackWebhookURL(e.target.value)}
              placeholder="https://hooks.slack.com/services/{webhook.id}/{webhook.token}"
              icon={faSlack}
              divClass="flex-1"
            />

            <Button
              text="Test"
              onClick={() => handleTestCommunication("slack", slackWebhookURL)}
              disabled={!slackWebhookURL}
              divClass="mt-2"
            />
          </div>

          <div className="flex items-end gap-4">
            <Input
              label="Teams URL"
              type="text"
              name="teamsWebhookURL"
              id="teamsWebhookURL"
              value={teamsWebhookURL || ""}
              onChange={(e) => setTeamsWebhookURL(e.target.value)}
              placeholder="https://outlook.office.com/webhook/{webhook.id}/{webhook.token}"
              icon={faMicrosoft}
              divClass="flex-1"
            />

            <Button
              text="Test"
              onClick={() => handleTestCommunication("teams", teamsWebhookURL)}
              disabled={!teamsWebhookURL}
              divClass="mt-2"
            />
          </div>

          <Button
            text="Save"
            onClick={handleSave}
            disabled={!discordWebhookURL && !slackWebhookURL && !teamsWebhookURL}
            divClass=""
          />
        </div>

        <div className="w-1/2 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-2xl p-6 gap-6 bg-card dark:bg-card-dark transition duration-300">
          <div>
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Recent notifications</h2>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Last events sent to your channels.</p>
            <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
          </div>

          <div className="flex flex-col gap-4">
            {latestCommunicationLogs?.length === 0 && (
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">No recent notifications.</p>
            )}
            {latestCommunicationLogs?.map((log, index) => (
              <div key={index + 0} className={`flex flex-col gap-2.5 max-w-150 py-3 px-3.5 rounded-[14px] bg-input dark:bg-input-dark`}>
                <div className="flex h-6 gap-3">
                  <div className={`text-white py-1 px-2.5 text-[10.5px] uppercase tracking-[0.03em] shrink-0 font-extrabold rounded-full bg-[#403355]`}>
                    {log.type}
                  </div>
                  <span className="text-[14px] font-semibold">{log.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Communication
