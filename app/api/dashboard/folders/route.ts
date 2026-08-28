import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folders = await prisma.folders.findMany({
      where: {
        OR: [{ user_id: session.userId }, { files: { some: { user_id: session.userId } } }],
      },
      select: { id: true, name: true, _count: { select: { files: true } } },
      orderBy: { created_at: "desc" },
    });

    return Response.json({
      folders: folders.map((f) => ({ id: f.id, name: f.name, fileCount: f._count.files })),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Dashboard folders error:", errorMessage);
    return Response.json({ error: "Internal server error: " + errorMessage }, { status: 500 });
  }
}