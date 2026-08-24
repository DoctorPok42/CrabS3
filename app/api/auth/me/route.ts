import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return Response.json({ error: "Session expired or not found" }, { status: 401 });
    }

    const userName = await prisma.users.findUnique({
      where: { id: session.userId },
      select: { name: true, id: true, twoFactorEnabled: true },
    });

    return Response.json({
      id: session.user.id,
      email: session.user.email,
      name: userName?.name,
      isAdmin: session.user.isAdmin,
      twoFactorEnabled: userName?.twoFactorEnabled ?? false,
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    const session = await getSession();
    await log({
      level: LogLevel.ERROR,
      action: LogAction.AUTH_LOGIN,
      message: "Failed to fetch user info",
      userId: session?.userId,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json({ error: "Failed to fetch user info" }, { status: 500 });
  }
}
