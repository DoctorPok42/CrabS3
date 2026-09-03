import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { getSession } from "@/lib/auth";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { handleScanResult } from "@/services/clamav.service";
import { checkPasswordStrength, resolveUploadDefaults } from "@/lib/upload-policy";
import { getIp } from "@/lib/ip";

export async function POST(request: Request) {
  const { fileId, folderId, uploadId, parts, metadata, folderName } = await request.json();
  let response;
  const session = await getSession();

  try {
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.UPLOAD,
      message: "Upload completion started",
      userId: session.user.id,
      meta: { fileId, folderId, partCount: parts.length, folderName }
    });

    const existingFile = await prisma.files.findFirst({
      where: { id: fileId, user_id: session.user.id },
    });

    if (!existingFile) {
      return Response.json({ error: "File not found or unauthorized" }, { status: 404 });
    }

    const passwordCheck = await checkPasswordStrength(metadata.password);
    if (!passwordCheck.ok) {
      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
      })).catch(console.error);

      return Response.json({ error: passwordCheck.error }, { status: passwordCheck.status ?? 400 });
    }

    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { quota: true, id: true },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userFiles = await prisma.files.aggregate({
      where: { user_id: session.user.id },
      _sum: { size: true },
    });

    const currentUsage = userFiles._sum.size || BigInt(0);
    const totalUsage = currentUsage + BigInt(metadata.size);

    if (user.quota !== BigInt(-1) && totalUsage > user.quota) {
      const quotaGB = Number(user.quota) / (1024 * 1024 * 1024);
      const usedGB = Number(currentUsage) / (1024 * 1024 * 1024);
      const fileGB = Number(BigInt(metadata.size)) / (1024 * 1024 * 1024);

      await log({
        level: LogLevel.WARN,
        action: LogAction.UPLOAD,
        message: "Upload rejected: quota exceeded",
        userId: session.user.id,
        meta: { quotaGB, usedGB, fileGB, folderId, fileId, folderName }
      });

      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
      }));

      await prisma.files.delete({
        where: { id: fileId },
      }).catch(console.error);

      return Response.json(
        {
          error: `Exceeded quota. You have used ${usedGB.toFixed(2)} GB / ${quotaGB.toFixed(2)} GB. This file is ${fileGB.toFixed(2)} GB.`,
        },
        { status: 413 }
      );
    }

    response = await s3Hot.send(
      new CompleteMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
        MultipartUpload: { Parts: sortedParts },
      })
    );

    if (!response.ETag) {
      await log({
        level: LogLevel.ERROR,
        action: LogAction.UPLOAD,
        message: "S3 upload completion failed: no ETag returned",
        userId: session.user.id,
        meta: { folderId, fileId, uploadId, folderName }
      });
      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
      }));
      return Response.json({ error: "Failed to complete upload" }, { status: 500 });
    }

    await prisma.folders.upsert({
      where: { id: folderId },
      update: { name: folderName || "" },
      create: { id: folderId, name: folderName || "" },
    })

    const defaults = await resolveUploadDefaults(metadata);

    await prisma.files.update({
      where: { id: fileId },
      data: {
        max_downloads: defaults.maxDownloads || metadata.maxDownloads ? Number.parseInt(metadata.maxDownloads) : null,
        download_count: 0,
        expires_at: defaults.expiresAt,
        size: Number.parseInt(metadata.size),
        uploaded_at: new Date(),
        email_sender: session.user.email,
        email_recipient: metadata.emailRecipient || null,
        password_hash: metadata.password ? await bcrypt.hash(metadata.password, 10) : null,
        email_message: metadata.emailMessage || null,
      },
    }).catch(console.error);

    await prisma.multipart_uploads.deleteMany({
      where: { file_id: fileId },
    }).catch(() => { });
  } catch (error) {
    console.error("Complete error:", error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: "Upload completion failed",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error), folderId, fileId, folderName }
    });

    try {
      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
      }));
    } catch (abortError) {
      console.error("Abort error:", abortError);
      await log({
        level: LogLevel.ERROR,
        action: LogAction.UPLOAD,
        message: "Failed to abort upload after error",
        userId: session?.user.id,
        meta: { error: abortError instanceof Error ? abortError.message : String(abortError), folderId, fileId, folderName }
      });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const ServerResponse = Response.json({
    folderId,
    etag: response.ETag,
    filename: metadata.filename,
    folderName: folderName || null,
  });

  (async () => {
    try {
      await handleScanResult(folderId, fileId, metadata.filename, session.user.id, getIp(request));
    } catch (error) {
      console.error("Failed to handle scan result:", error instanceof Error ? error.message : String(error));
    }
  })();

  return ServerResponse;
}
