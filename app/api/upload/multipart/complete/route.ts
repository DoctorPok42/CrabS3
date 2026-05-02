import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  const { fileId, uploadId, parts, metadata } = await request.json();

  try {
    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    const response = await s3Hot.send(
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
        max_downloads: metadata.maxDownloads ? Number.parseInt(metadata.maxDownloads) : -1,
        download_count: 0,
        expires_at: metadata.expireAfter
          ? new Date(Date.now() + Number.parseInt(metadata.expireAfter) * 24 * 60 * 60 * 1000)
          : null,
        size: Number.parseInt(metadata.size),
        uploaded_at: new Date(),
        notify_email: metadata.notifyEmail || null,
        password_hash: metadata.password ? await bcrypt.hash(metadata.password, 10) : null,
      },
    }).catch(console.error);

    return Response.json({
      fileId,
      etag: response.ETag,
      filename: metadata.filename,
    });
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
}
