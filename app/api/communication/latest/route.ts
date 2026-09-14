import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const userId = session.user?.id;
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const latestCommunications = await prisma.webhooks_logs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        title: true,
        type: true,
        status: true,
        created_at: true,
      },
      take: 3,
    });
    if (!latestCommunications || latestCommunications.length === 0) {
      return new Response(JSON.stringify({ error: "No communications found" }), { status: 404 });
    }

    return new Response(JSON.stringify(latestCommunications), { status: 200 });
  } catch (error) {
    console.error("Error fetching communication settings:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
