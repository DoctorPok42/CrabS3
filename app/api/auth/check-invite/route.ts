import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.json({ valid: false, error: "Token required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation) {
    return Response.json({ valid: false, error: "Invalid invitation" });
  }
  if (invitation.usedAt) {
    return Response.json({ valid: false, error: "Invitation already used" });
  }
  if (invitation.expires_at < new Date()) {
    return Response.json({ valid: false, error: "Invitation expired" });
  }

  return Response.json({ valid: true, email: invitation.email });
}
