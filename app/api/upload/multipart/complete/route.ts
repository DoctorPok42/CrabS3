import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { sendNotificationEmail, sendRecipientNotificationEmail } from "@/services/mail.service";
import { getSession } from "@/lib/auth";
import { sendAllActiveCommunications } from "@/lib/webhook";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  const { fileId, folderId, uploadId, parts, metadata } = await request.json();
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
      userId: session.userId,
      meta: { fileId, folderId, partCount: parts.length }
    });

    const existingFile = await prisma.files.findFirst({
      where: { id: fileId, user_id: session.userId },
    });

    if (!existingFile) {
      return Response.json({ error: "File not found or unauthorized" }, { status: 404 });
    }

    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    const user = await prisma.users.findUnique({
      where: { id: session.userId },
      select: { quota: true, id: true },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userFiles = await prisma.files.aggregate({
      where: { user_id: session.userId },
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
        userId: session.userId,
        meta: { quotaGB, usedGB, fileGB, folderId, fileId }
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
        userId: session.userId,
        meta: { folderId, fileId, uploadId }
      });
      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
      }));
      return Response.json({ error: "Failed to complete upload" }, { status: 500 });
    }

    await prisma.files.update({
      where: { id: fileId },
      data: {
        max_downloads: metadata.maxDownloads ? Number.parseInt(metadata.maxDownloads) : null,
        download_count: 0,
        expires_at: metadata.expireAfter
          ? new Date(Date.now() + Number.parseInt(metadata.expireAfter) * 24 * 60 * 60 * 1000)
          : null,
        size: Number.parseInt(metadata.size),
        uploaded_at: new Date(),
        email_sender: metadata.emailSender || null,
        email_recipient: metadata.emailRecipient || null,
        password_hash: metadata.password ? await bcrypt.hash(metadata.password, 10) : null,
        email_message: metadata.emailMessage || null,
        storage: "hot",
        user_id: session.userId,
      },
    }).catch(console.error);
  } catch (error) {
    console.error("Complete error:", error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: "Upload completion failed",
      userId: session?.userId,
      meta: { error: error instanceof Error ? error.message : String(error), folderId, fileId }
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
        userId: session?.userId,
        meta: { error: abortError instanceof Error ? abortError.message : String(abortError) }
      });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }

  await log({
    action: LogAction.UPLOAD,
    message: `File ${metadata.filename} uploaded`,
    userId: session.userId,
    meta: { folderId, fileId, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
  });

  try {
    if (metadata.emailSender)
      await sendNotificationEmail(metadata.emailSender, folderId);
    if (metadata.emailRecipient)
      await sendRecipientNotificationEmail(metadata.emailRecipient, folderId, metadata.emailSender, metadata.emailMessage);

    await sendAllActiveCommunications(session.userId, {
      content: "",
      embeds: [
        {
          title: "File uploaded",
          fields: [
            { name: "Filename", value: metadata.filename, inline: true },
            { name: "Size", value: `${(Number.parseInt(metadata.size) / (1024 * 1024)).toFixed(2)} MB`, inline: true },
            { name: "Expires At", value: metadata.expireAfter ? new Date(Date.now() + Number.parseInt(metadata.expireAfter) * 24 * 60 * 60 * 1000).toLocaleString() : "Never", inline: true },
            { name: "Max Downloads", value: metadata.maxDownloads ? metadata.maxDownloads : "Unlimited", inline: true },
            { name: "Download Link", value: `${process.env.BASE_URL}/file/${folderId}`, inline: false }
          ],
        },
      ],
    })
  } catch (error) {
    console.error("Failed to send notification email:", error instanceof Error ? error.message : String(error));
  }

  return Response.json({
    folderId,
    etag: response.ETag,
    filename: metadata.filename,
  });
}
