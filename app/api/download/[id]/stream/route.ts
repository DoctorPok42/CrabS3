import { s3Hot, s3Cold, HOT_BUCKET, COLD_BUCKET } from "@/services/s3.service";
import { DeleteObjectsCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { sendDownloadNotificationEmail } from "@/services/mail.service";

const getFileData = async (fileId: string): Promise<string | null> => {
  try {
    const url = await getSignedUrl(s3Hot, new GetObjectCommand({
      Bucket: HOT_BUCKET,
      Key: fileId,
    }), { expiresIn: 3600 });

    return url;
  } catch (err: any) {
    if (err?.name !== "NotFound" && err?.name !== "NoSuchKey") {
      throw err;
    }
  }

  try {
    const url = await getSignedUrl(s3Cold, new GetObjectCommand({
      Bucket: COLD_BUCKET,
      Key: fileId,
    }), { expiresIn: 3600 });

    return url;
  } catch (err: any) {
    if (err?.name !== "NotFound" && err?.name !== "NoSuchKey") {
      throw err;
    }
  }

  return null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const password = await request.json().then(data => data.password).catch(() => null);

    const metadata: { filename?: string; contentType?: string; maxDownloads?: string; notifyEmail?: string } = {};
    try {
      const file = await prisma.files.findUnique({
        where: { id: fileId },
        select: { password_hash: true, filename: true, size: true, email_sender: true },
      });
      if (file?.password_hash) {
        if (!password) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, file.password_hash);
        if (!isPasswordValid) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        metadata.filename = file.filename;
        metadata.contentType = "application/octet-stream";
        metadata.maxDownloads = file.size.toString();
        metadata.notifyEmail = file.email_sender!;
      }
      if (!file) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        return Response.json({ error: "File not found" }, { status: 404 });
      }
      throw error;
    }

    if (!metadata) {
      return Response.json({ error: "File metadata not found" }, { status: 404 });
    }

    const urlFile = await getFileData(fileId);

    if (!urlFile) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const fileResponse = await fetch(urlFile);
    if (!fileResponse.ok) {
      return Response.json({ error: "Failed to fetch file" }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    if (metadata.maxDownloads) {
      const maxDownloads = Number.parseInt(metadata.maxDownloads);
      if (Number.isNaN(maxDownloads) || maxDownloads <= 0) {
        return Response.json({ error: "Invalid max downloads value" }, { status: 500 });
      }

      const newMaxDownloads = maxDownloads - 1;

      if (newMaxDownloads === 0) {
        await s3Hot.send(new DeleteObjectsCommand({
          Bucket: HOT_BUCKET,
          Delete: {
            Objects: [
              { Key: fileId },
            ],
          },
        }));
      }
    }

    await prisma.files.update({
      where: { id: fileId },
      data: {
        download_count: { increment: 1 },
      },
    }).catch(console.error);

    await sendDownloadNotificationEmail(metadata.notifyEmail || "", fileId);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${metadata.filename || fileId}"`,
        "Content-Length": fileBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
