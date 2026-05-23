import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "User profile update request",
      userId: session.userId,
    });

    const { name, password } = await request.json();

    if (typeof name !== "string" || name.trim() === "") {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let newPasswordHash: string | null = null;
    if (password) {
      if (typeof password !== "string" || password.length < 8) {
        return Response.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
      }

      newPasswordHash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.users.update({
      where: { id: session.userId },
      select: { name: true },
      data: {
        name: name.trim(),
        ...(newPasswordHash && {
          passwordHash: newPasswordHash
        }),
      },
    });

    return Response.json({ user: { name: updatedUser.name } });
  } catch (error) {
    console.error("Error updating user profile:", error);
    const session = await getSession();
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to update user profile",
      userId: session?.userId,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json({ error: "Failed to update profile" }, { status: 500 });
  }
}