import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import { AbortMultipartUploadCommand, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { signUploadToken } from "@/lib/upload-token";
import { getChunkSize } from "@/lib/chunk-size";

export async function POST(request: Request) {
  try {
    const filename = decodeURIComponent(request.headers.get("X-Filename") || "").trim();
    const folderId = request.headers.get("X-Folder-Id") || randomUUID();
    const fileSize = request.headers.get("X-File-Size");
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";
    const contentHash = request.headers.get("X-Content-Hash") || null;

    if (!filename) {
      return Response.json({ error: "X-Filename required" }, { status: 400 });
    }

    if (!fileSize) {
      return Response.json({ error: "X-File-Size required" }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileSizeBytes = BigInt(fileSize);

    await prisma.folders.upsert({
      where: { id: folderId },
      update: {},
      create: { id: folderId, name: "" },
    }).catch((error) => {
      if (error.code === "P2002") {
        return;
      }
      throw error;
    });

    const [user, userFiles] = await Promise.all([
      prisma.users.findUnique({
        where: { id: session.userId },
        select: { quota: true, id: true },
      }),
      prisma.files.aggregate({
        where: { user_id: session.userId },
        _sum: { size: true },
      })
    ]);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const currentUsage = userFiles._sum.size || BigInt(0);
    const totalUsage = currentUsage + fileSizeBytes;

    if (user.quota !== BigInt(-1) && totalUsage > user.quota) {
      const quotaGB = Number(user.quota) / (1024 * 1024 * 1024);
      const usedGB = Number(currentUsage) / (1024 * 1024 * 1024);
      const fileGB = Number(fileSizeBytes) / (1024 * 1024 * 1024);
      (async () => {
        log({
          level: LogLevel.WARN,
          action: LogAction.UPLOAD,
          message: `User ${session.userId} exceeded quota. Used: ${usedGB.toFixed(2)} GB, Quota: ${quotaGB.toFixed(2)} GB, File Size: ${fileGB.toFixed(2)} GB`,
          userId: session.userId,
        })
      })();

      return Response.json(
        {
          error: `Exceeded quota. You have used ${usedGB.toFixed(2)} GB / ${quotaGB.toFixed(2)} GB. This file is ${fileGB.toFixed(2)} GB.`,
        },
        { status: 413 }
      );
    }

    const fileId = randomUUID();
    const chunkSize = getChunkSize(Number(fileSizeBytes));

    const { UploadId } = await s3Hot.send(
      new CreateMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        ContentType: contentType,
        StorageClass: "EXPRESS_ONEZONE"
      })
    );

    if (!UploadId) {
      return Response.json({ error: "Failed to create multipart upload" }, { status: 500 });
    }

    await prisma.files.create({
      data: {
        id: fileId,
        filename,
        size: Number.parseInt(fileSize),
        content_type: contentType,
        folder_id: folderId,
        user_id: session.userId,
        uploaded_at: null,
        storage: "hot",
        hash: contentHash,
        storage_key: folderId + "/" + fileId,
      },
    }).catch(console.error);

    await prisma.multipart_uploads.create({
      data: {
        file_id: fileId,
        folder_id: folderId,
        upload_id: UploadId,
        filename,
        chunk_size: chunkSize,
        total_size: fileSizeBytes,
      },
    }).catch(async (error) => {
      if (error.code === "P2003") {
        await s3Hot.send(new AbortMultipartUploadCommand({
          Bucket: HOT_BUCKET,
          Key: folderId + "/" + fileId,
          UploadId: UploadId,
        }));
      }
      await prisma.files.deleteMany({ where: { id: fileId } }).catch(() => { });
      throw error;
    });

    const token = signUploadToken({
      uid: session.userId,
      fid: fileId,
      fol: folderId,
      upl: UploadId,
    });

    return Response.json({ fileId, uploadId: UploadId, token, chunkSize }, { status: 200 });
  } catch (error) {
    console.error("Start error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
