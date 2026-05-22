import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userName = await prisma.users.findUnique({
    where: { id: session.userId },
    select: { name: true, id: true },
  });

  return Response.json({
    id: session.user.id,
    email: session.user.email,
    name: userName?.name,
    isAdmin: session.user.isAdmin,
  });
}
