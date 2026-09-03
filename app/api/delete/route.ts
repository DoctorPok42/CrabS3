import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { log } from "@/services/log.service"
import { LogAction, LogLevel } from "@/types/log.types"
import { getIp } from "@/lib/ip"
import { deleteFilesAndReclaimStorage, deleteStorageObjectIfUnreferenced } from "@/lib/storage-key"

export async function DELETE(request: Request) {
  let session;
  try {
    const { folderId, fileId, mode } = await request.json()

    if (!folderId || !fileId) {
      return Response.json({ error: 'Missing folderId or fileId' }, { status: 400 })
    }

    session = await getSession()
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.DELETE,
      message: "Delete request started",
      userId: session.user.id,
      meta: { folderId, fileId, mode }
    })

    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        folder_id: folderId,
        user_id: session.user.id,
      }
    })
    if (!file) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    const siblings = file.hash
      ? await prisma.files.findMany({
        where: { user_id: session.user.id, hash: file.hash, id: { not: file.id } },
        select: { id: true, filename: true },
      })
      : [];

    if (siblings.length > 0 && mode !== "this" && mode !== "all") {
      return Response.json(
        {
          needsConfirmation: true,
          siblingCount: siblings.length,
          siblingFilenames: siblings.slice(0, 5).map((s) => s.filename),
        },
        { status: 409 }
      );
    }

    if (mode === "all" && file.hash) {
      const group = await prisma.files.findMany({
        where: { user_id: session.user.id, hash: file.hash },
        select: { id: true, folder_id: true, storage_key: true, filename: true },
      });

      const removedCount = await deleteFilesAndReclaimStorage(group);

      await log({
        action: LogAction.DELETE,
        message: `Deleted ${removedCount} files sharing content with "${file.filename}"`,
        userId: session.user.id,
        meta: { folderId, fileId, groupIds: group.map((f) => f.id), ip: getIp(request) },
      });

      return Response.json({ message: 'Files deleted successfully', removedCount });
    }

    await deleteStorageObjectIfUnreferenced(file)

    await prisma.files.delete({
      where: {
        id: fileId
      }
    })

    await log({
      action: LogAction.DELETE,
      message: `File ${file.filename} deleted`,
      userId: session.user.id,
      meta: { folderId, fileId, ip: getIp(request), siblingsRemaining: siblings.length },
    })

    return Response.json({ message: 'File deleted successfully', removedCount: 1 })
  } catch (error) {
    console.error('Error deleting file:', error)
    await log({
      level: LogLevel.ERROR,
      action: LogAction.DELETE,
      message: "Failed to delete file",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
