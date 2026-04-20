import s3 from "@/services/s3.service";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";

export async function POST(request: Request) {
  try {
    const { fileId, uploadId } = await request.json();

    if (!fileId || !uploadId) {
      return Response.json({ error: "Missing fileId or uploadId" }, { status: 400 });
    }

    await s3.send(new AbortMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileId,
      UploadId: uploadId,
    }));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Abort error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
