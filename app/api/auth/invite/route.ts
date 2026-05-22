import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendInvitationEmail } from "@/services/mail.service";
import { log } from "@/services/log.service";
import { LogAction } from "@/types/log.types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await request.json();
  if (!email) {
    return Response.json({ error: "Email required" }, { status: 400 });
  }

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "User already exists" }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  const invitation = await prisma.invitation.upsert({
    where: { email },
    update: { token: crypto.randomUUID(), expiresAt, usedAt: null },
    create: { email, expiresAt, invitedById: session.userId },
  });

  await sendInvitationEmail(email, invitation.token);

  await log({
    action: LogAction.ADMIN_ACTION,
    message: `Invitation sent to ${email}`,
    userId: session.userId,
    meta: { email, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
  });

  return Response.json({ success: true });
}
