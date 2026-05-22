import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { log } from "@/services/log.service"
import { LogAction } from "@/types/log.types"

export async function POST(request: Request) {
  const { content, expiresAt, maxViews, password } = await request.json()

  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Content is required and must be a string." }), { status: 400 })
    }

    const id = crypto.randomUUID()

    const secret = await prisma.secrets.create({
      data: {
        id,
        content,
        expires_at: new Date(expiresAt),
        created_at: new Date(),
        max_views: maxViews,
        view_count: 0,
        user_id: session?.userId,
        password_hash: password ? await bcrypt.hash(password, 12) : null,
      }
    })

    if (!secret) {
      return new Response(JSON.stringify({ error: "Failed to create secret." }), { status: 500 })
    }

    await log({
      action: LogAction.UPLOAD,
      message: "Secret created",
      userId: session.userId,
      meta: { secretId: secret.id, expiresAt, maxViews, hasPassword: !!password, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
    })

    return new Response(JSON.stringify({ id: secret.id }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request body.", details: error }), { status: 400 })
  }
}
