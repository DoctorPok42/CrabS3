import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import { ListPartsCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { signUploadToken } from "@/lib/upload-token";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = request.headers.get("X-File-Id");
    if (!fileId) {
      return Response.json({ error: "X-File-Id required" }, { status: 400 });
    }

    const pending = await prisma.multipart_uploads.findUnique({
      where: { file_id: fileId },
    });

    const file = await prisma.files.findFirst({
      where: { id: fileId, user_id: session.userId },
    });

    if (!pending || !file) {
      return Response.json({ error: "No resumable upload found" }, { status: 404 });
    }

    if (file.uploaded_at) {
      await prisma.multipart_uploads.deleteMany({ where: { file_id: fileId } }).catch(() => { });
      return Response.json({ error: "Upload already completed" }, { status: 409 });
    }

    const key = `${pending.folder_id}/${fileId}`;
    const uploadedParts: { PartNumber: number; ETag: string; Size: number }[] = [];

    try {
      let partNumberMarker: string | undefined;
      do {
        const result = await s3Hot.send(
          new ListPartsCommand({
            Bucket: HOT_BUCKET,
            Key: key,
            UploadId: pending.upload_id,
            PartNumberMarker: partNumberMarker,
          })
        );

        for (const part of result.Parts || []) {
          if (part.PartNumber != null && part.ETag) {
            uploadedParts.push({
              PartNumber: part.PartNumber,
              ETag: part.ETag,
              Size: part.Size ?? 0,
            });
          }
        }

        partNumberMarker = result.IsTruncated ? result.NextPartNumberMarker : undefined;
      } while (partNumberMarker);
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchUpload") {
        await prisma.multipart_uploads.deleteMany({ where: { file_id: fileId } }).catch(() => { });
        await prisma.files.deleteMany({ where: { id: fileId } }).catch(() => { });
        return Response.json({ error: "Upload expired, please start again" }, { status: 410 });
      }
      throw error;
    }

    const token = signUploadToken({
      uid: session.userId,
      fid: fileId,
      fol: pending.folder_id!,
      upl: pending.upload_id,
    });

    return Response.json(
      {
        fileId,
        folderId: pending.folder_id,
        uploadId: pending.upload_id,
        token,
        chunkSize: pending.chunk_size,
        totalSize: pending.total_size.toString(),
        filename: pending.filename,
        uploadedParts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resume error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
