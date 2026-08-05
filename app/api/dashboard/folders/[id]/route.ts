import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: folderId } = await params;
  const { name } = await request.json();

  if (typeof name !== "string" || name.trim() === "") {
    return Response.json({ error: "Folder name is required" }, { status: 400 });
  }

  const ownedFile = await prisma.files.findFirst({
    where: { folder_id: folderId, user_id: session.userId },
    select: { id: true },
  });

  if (!ownedFile) {
    return Response.json({ error: "Folder not found or unauthorized" }, { status: 404 });
  }

  const updatedFolder = await prisma.folders.update({
    where: { id: folderId },
    data: { name: name.trim() },
    select: { id: true, name: true },
  });

  return Response.json({ folder: updatedFolder });
}
