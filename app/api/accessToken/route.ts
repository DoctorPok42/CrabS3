import { getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const userAccessTokens = await prisma.user_access_tokens.findMany({
      where: { user_id: session.user.id },
      select: {
        id: true,
        name: true,
        scopes: true,
        expires_at: true,
        created_at: true,
      },
    })

    return new Response(JSON.stringify({ accessTokens: userAccessTokens }), { status: 200 })
  } catch (error) {
    console.error("Error in GET /api/accessToken:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const { name, scopes, expires_at } = await request.json()

    const validScopes = ["READ", "WRITE", "DELETE", "ADMIN"]
    const validExpiresAtOptions = [7, 30, 90, 180, 365]

    const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope))
    const invalidExpiresAt = !validExpiresAtOptions.includes(expires_at)
    if (invalidScopes.length > 0 || invalidExpiresAt) {
      return new Response(JSON.stringify({
        error:
          `Invalid scopes or expires_at value. Valid scopes: ${validScopes.join(", ")}. Valid expires_at options: ${validExpiresAtOptions.join(", ")}`
      }), { status: 400 })
    }

    const existingToken = await prisma.user_access_tokens.findFirst({
      where: {
        user_id: session.user.id,
        name,
      },
    })
    if (existingToken) {
      return new Response(JSON.stringify({ error: "An access token with this name already exists" }), { status: 400 })
    }

    const tokenValue = crypto.randomUUID()
    const expirationDate = new Date(Date.now() + expires_at * 24 * 60 * 60 * 1000)

    const newAccessToken = await prisma.user_access_tokens.create({
      data: {
        name,
        scopes,
        expires_at: expirationDate,
        created_at: new Date(),
        token: tokenValue,
        user_id: session.user.id,
      },
    })
    if (!newAccessToken) {
      return new Response(JSON.stringify({ error: "Failed to create access token" }), { status: 500 })
    }

    (async () => {
      await log({
        level: LogLevel.INFO,
        action: LogAction.ACCESS_TOKEN_CREATED,
        userId: session.user.id,
        message: `Access token created: ${name}`,
        meta: { tokenId: newAccessToken.id, scopes, expires_at: expirationDate.toISOString(), ip: getIp(request) },
      })
    })()

    return new Response(JSON.stringify({ accessToken: newAccessToken }), { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/accessToken:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return new Response(JSON.stringify({ error: "Access token ID is required" }), { status: 400 })
    }

    const deletedToken = await prisma.user_access_tokens.delete({
      where: {
        id: parseInt(id),
        user_id: session.user.id,
      },
    })
    if (deletedToken === null) {
      return new Response(JSON.stringify({ error: "Access token not found" }), { status: 404 })
    }

    (async () => {
      await log({
        level: LogLevel.INFO,
        action: LogAction.ACCESS_TOKEN_DELETED,
        userId: session.user.id,
        message: `Access token deleted: ${deletedToken.name}`,
        meta: { tokenId: deletedToken.id, ip: getIp(request) },
      })
    })()

    return new Response(JSON.stringify({ message: "Access token deleted successfully" }), { status: 200 })
  } catch (error) {
    console.error("Error in DELETE /api/accessToken:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 })
  }
}
