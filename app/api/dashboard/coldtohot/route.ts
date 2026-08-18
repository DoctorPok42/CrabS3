import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveStorageKey } from "@/lib/storage-key";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";
import { CopyObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { folderId } = await request.json();
    if (!folderId || typeof folderId !== "string") {
      return Response.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        id: folderId,
        OR: [
          { user_id: session.userId },
          { files: { some: { user_id: session.userId } } }
        ]
      },
    });
    if (!folder) {
      return Response.json({ error: "Folder not found" }, { status: 404 });
    }

    const findFiles = await prisma.files.findMany({
      where: { folder_id: folderId, user_id: session.userId },
    });
    if (!findFiles || findFiles.length === 0) {
      return Response.json({ error: "Folder not found" }, { status: 404 });
    }

    const uniqueKeys = new Set(
      findFiles.map((f) => resolveStorageKey(f)).filter((k): k is string => !!k)
    );

    for (const key of uniqueKeys) {
      await s3Hot.send(new CopyObjectCommand({
        Bucket: HOT_BUCKET,
        CopySource: `/${HOT_BUCKET}/${encodeURIComponent(key)}`,
        Key: key,
        StorageClass: "EXPRESS_ONEZONE",
        MetadataDirective: "REPLACE",
      }))
    }

    const updateFiles = await prisma.files.updateMany({
      where: { storage_key: { in: Array.from(uniqueKeys) }, user_id: session.userId },
      data: { storage: "hot" },
    });
    if (updateFiles.count === 0) {
      return Response.json({ error: "Failed to update file storage status" }, { status: 500 });
    }

    return Response.json({ message: "Files moved from cold to hot storage successfully" });
  } catch (error) {
    console.error("Error moving files from cold to hot storage:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
