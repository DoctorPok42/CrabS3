import { getSession } from "@/lib/auth";
import { createCommunication, getActiveCommunication } from "@/lib/webhook";
import { WebHookType } from "@/services/webhook.service";

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const allCommunication = await getActiveCommunication(session.user.id)
    return new Response(JSON.stringify(allCommunication), { status: 200 })
  } catch (error) {
    console.error("Error fetching communication settings:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

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
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}

