import prisma from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  await log({
    level: LogLevel.DEBUG,
    action: LogAction.AUTH_LOGIN,
    message: "Login attempt",
    meta: { email, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined }
  });

  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isAdmin: true,
    }
  });
  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await log({
      action: LogAction.AUTH_FAILED,
      level: LogLevel.WARN,
      message: "Invalid credentials",
      userId: user.id,
      meta: { email, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
    });

    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(user.id, user.email, user.isAdmin);

  await log({
    action: LogAction.AUTH_LOGIN,
    message: "User logged in",
    userId: user.id,
    meta: { email, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
  });

  return Response.json({ success: true });
}
