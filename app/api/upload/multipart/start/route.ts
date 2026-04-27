import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  try {
    const filename = request.headers.get("X-Filename");
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";

    if (!filename) {
      return Response.json({ error: "X-Filename required" }, { status: 400 });
    }

    const fileId = randomUUID();

    const { UploadId } = await s3Hot.send(
      new CreateMultipartUploadCommand({
        Bucket: HOT_BUCKET,
        Key: fileId,
        ContentType: contentType,
      })
    );

    if (!UploadId) {
      return Response.json({ error: "Failed to create multipart upload" }, { status: 500 });
    }

    return Response.json({ fileId, uploadId: UploadId });
  } catch (error) {
    console.error("Start error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
