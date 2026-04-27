import { s3Hot, HOT_BUCKET, META_BUCKET } from "@/services/s3.service";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

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

    await s3Hot.send(
      new PutObjectCommand({
        Bucket: META_BUCKET,
        Key: `${fileId}.metadata.json`,
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
      })
    );

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
