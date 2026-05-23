import { getSession } from "@/lib/auth";
import { createCommunication, getActiveCommunication } from "@/lib/webhook";
import { WebHookType } from "@/services/webhook.service";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "Fetching communication settings",
      userId: session.user.id,
    })

    const allCommunication = await getActiveCommunication(session.user.id)
    return new Response(JSON.stringify(allCommunication), { status: 200 })
  } catch (error) {
    console.error("Error fetching communication settings:", error)
    const session = await getSession()
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to fetch communication settings",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    })
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "Creating communication webhook",
      userId: session.user.id,
    })

    const { webhook }: { webhook: Array<{ type: WebHookType; url: string }> } = await request.json()
    if (!webhook?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }
    for (const { type, url } of webhook) {
      await createCommunication(session.user.id, type, url)
    }

    return new Response(JSON.stringify({ message: "Communication settings updated successfully" }), { status: 200 })
  } catch (error) {
    console.error("Error creating communication:", error)
    const session = await getSession()
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to create communication webhook",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    })
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}

