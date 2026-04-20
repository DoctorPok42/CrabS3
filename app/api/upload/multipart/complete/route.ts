import s3 from "@/services/s3.service";
import {
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export async function POST(request: Request) {
  const { fileId, uploadId, parts, metadata } = await request.json();

  try {
    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    const response = await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileId,
        UploadId: uploadId,
        MultipartUpload: { Parts: sortedParts },
      })
    );

    if (!response.ETag) {
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileId,
        UploadId: uploadId,
      }));
      return Response.json({ error: "Failed to complete upload" }, { status: 500 });
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
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
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileId,
        UploadId: uploadId,
      }));
    } catch (abortError) {
      console.error("Abort error:", abortError);
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
