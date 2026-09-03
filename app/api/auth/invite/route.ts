import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendInvitationEmail } from "@/services/mail.service";
import { log } from "@/services/log.service";
import { LogAction } from "@/types/log.types";
import { getIp } from "@/lib/ip";
import { Settings } from "@/services/settings.service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user.isAdmin) {
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

  const invitationExpirationDays = await Settings.inviteExpiryHours() * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + (invitationExpirationDays || 24 * 60 * 60 * 1000));

  const invitation = await prisma.invitation.upsert({
    where: { email },
    update: { token: crypto.randomUUID(), expires_at: expiresAt, usedAt: null },
    create: { email, expires_at: expiresAt, invitedById: session.user.id },
  });

  await sendInvitationEmail(email, invitation.token);

  await log({
    action: LogAction.ADMIN_ACTION,
    message: `Invitation sent to ${email}`,
    userId: session.user.id,
    meta: { email, ip: getIp(request) },
  });

  return Response.json({ success: true });
}
