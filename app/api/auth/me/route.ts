import { getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userName = await prisma.users.findUnique({
      where: { id: session.user.id },
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

    await log({
      level: LogLevel.ERROR,
      action: LogAction.AUTH_LOGIN,
      message: "Failed to fetch user info",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json({ error: "Failed to fetch user info" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$transaction([
      prisma.users.delete({ where: { id: session.user.id } }),
      prisma.session.deleteMany({ where: { userId: session.user.id } }),
      prisma.invitation.deleteMany({ where: { invitedById: session.user.id } }),
      prisma.communication.deleteMany({ where: { user_id: session.user.id } }),
      prisma.secrets.deleteMany({ where: { user_id: session.user.id } }),
      prisma.folders.deleteMany({ where: { user_id: session.user.id } }),
    ]);

    const cookieStore = await cookies();
    cookieStore.set("session", "", {
      httpOnly: true,
      sameSite: "lax",
      expires: new Date(0),
    });

    (async () => {
      await log({
        level: LogLevel.INFO,
        action: LogAction.USER_DELETED,
        message: "User account deleted",
        userId: session.user.id,
        meta: { email: session.user.email, ip: getIp(request) }
      });
    })();

    return Response.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);

    await log({
      level: LogLevel.ERROR,
      action: LogAction.USER_DELETED,
      message: "Failed to delete user",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}