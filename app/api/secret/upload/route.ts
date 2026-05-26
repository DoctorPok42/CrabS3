import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { log } from "@/services/log.service"
import { LogAction, LogLevel } from "@/types/log.types"
import { getIp } from "@/lib/ip"

export async function POST(request: Request) {
  const { content, expiresAt, maxViews, password } = await request.json()

  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.UPLOAD,
      message: "Secret creation request",
      userId: session.userId,
      meta: { maxViews, hasPassword: !!password }
    })

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
      await log({
        level: LogLevel.ERROR,
        action: LogAction.UPLOAD,
        message: "Failed to create secret: database returned null",
        userId: session.userId,
        meta: { expiresAt, maxViews }
      })
      return new Response(JSON.stringify({ error: "Failed to create secret." }), { status: 500 })
    }

    await log({
      action: LogAction.UPLOAD,
      message: "Secret created",
      userId: session.userId,
      meta: { secretId: secret.id, expiresAt, maxViews, hasPassword: !!password, ip: getIp(request) },
    })

    return new Response(JSON.stringify({ id: secret.id }), { status: 201 })
  } catch (error) {
    const session = await getSession()
    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: "Failed to create secret: invalid request",
      userId: session?.userId,
      meta: { error: error instanceof Error ? error.message : String(error) }
    })
    return new Response(JSON.stringify({ error: "Invalid request body.", details: error }), { status: 400 })
  }
}
