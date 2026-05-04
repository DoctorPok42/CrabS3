import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { sendNotificationEmail, sendRecipientNotificationEmail } from "@/services/mail.service";

export async function POST(request: Request) {
  const { fileId, uploadId, parts, metadata } = await request.json();
  let response;

  try {
    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    response = await s3Hot.send(
      new CompleteMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: fileId,
        UploadId: uploadId,
        MultipartUpload: { Parts: sortedParts },
      })
    );

    if (!response.ETag) {
      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: fileId,
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
      },
    }).catch(console.error);
  } catch (error) {
    console.error("Complete error:", error);

    try {
      await s3Hot.send(new AbortMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: fileId,
        UploadId: uploadId,
      }));
    } catch (abortError) {
      console.error("Abort error:", abortError);
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    await sendNotificationEmail(metadata.emailSender, fileId);
    if (metadata.emailRecipient)
      await sendRecipientNotificationEmail(metadata.emailRecipient, fileId, metadata.emailSender);
  } catch (error) {
    console.error("Failed to send notification email:", error instanceof Error ? error.message : String(error));
  }

  return Response.json({
    fileId,
    etag: response.ETag,
    filename: metadata.filename,
  });
}
