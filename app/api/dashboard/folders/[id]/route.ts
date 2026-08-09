import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LogAction, LogLevel } from "@/types/log.types";
import { log } from "@/services/log.service";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  (async () => {
    await log({
      level: LogLevel.INFO,
      action: LogAction.FOLDER_RENAMED,
      message: `Folder renamed to ${name.trim()}`,
      userId: session.userId,
      meta: { folderId, newName: name.trim() },
    });
  })();

  return Response.json({ folder: updatedFolder });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: folderId } = await params;
    const ownedFile = await prisma.files.findFirst({
      where: { folder_id: folderId, user_id: session.userId },
      select: { id: true },
    });

    if (!ownedFile) {
      return Response.json({ error: "Folder not found or unauthorized" }, { status: 404 });
    }

    await prisma.folders.delete({
      where: { id: folderId },
    });

    (async () => {
      await log({
        level: LogLevel.INFO,
        action: LogAction.FOLDER_DELETED,
        message: `Folder deleted`,
        userId: session.userId,
        meta: { folderId },
      });
    })();

    return Response.json({ success: true });
  } catch (error) {
    console.error("Folder deletion error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
