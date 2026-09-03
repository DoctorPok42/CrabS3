import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = request.headers.get("X-File-Id");
    const contentHash = request.headers.get("X-Content-Hash");

    if (!fileId || !contentHash) {
      return Response.json({ error: "X-File-Id and X-Content-Hash required" }, { status: 400 });
    }

    const file = await prisma.files.findFirst({
      where: { id: fileId, user_id: session.user.id },
      select: { id: true },
    });

    if (!file) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    await prisma.files.update({
      where: { id: fileId },
      data: { hash: contentHash },
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Set-hash error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
