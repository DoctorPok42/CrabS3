import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcrypt";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { getIp } from "@/lib/ip";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const id = Number(pathname.split("/").slice(-3)[1]);

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "Admin password reset request",
      userId: session.user.id,
      meta: { targetUserId: id }
    });

    const { newPassword } = await request.json();
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return Response.json({ error: "Invalid password. Must be at least 6 characters long." }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: id }
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.users.update({
      where: { id: id },
      data: { passwordHash: hashedPassword },
    });

    await log({
      action: LogAction.ADMIN_ACTION,
      message: `Admin reset password for user ${id}`,
      userId: session.user.id,
      meta: { targetUserId: id, ip: getIp(request) },
    });

    return Response.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    const session = await getSession();
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to reset user password",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
