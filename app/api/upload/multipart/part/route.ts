import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import { UploadPartCommand } from "@aws-sdk/client-s3";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const fileId = request.headers.get("X-File-Id");
    const uploadId = request.headers.get("X-Upload-Id");
    const partNumber = request.headers.get("X-Part-Number");
    const contentLength = request.headers.get("Content-Length");

    if (!fileId || !uploadId || !partNumber) {
      return Response.json({ error: "Missing required headers" }, { status: 400 });
    }

    if (!request.body) {
      return Response.json({ error: "Empty body" }, { status: 400 });
    }

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return Response.json({ error: "Empty part" }, { status: 400 });
    }

    const response = await s3Hot.send(
      new UploadPartCommand({
        Bucket: HOT_BUCKET,
        Key: fileId,
        UploadId: uploadId,
        PartNumber: Number.parseInt(partNumber),
        Body: buffer,
        ContentLength: contentLength ? Number.parseInt(contentLength) : buffer.length,
      }),
      {
        abortSignal: AbortSignal.timeout(3_600_000),
        requestTimeout: 3_600_000,
      }
    );

    if (!response.ETag) {
      return Response.json({ error: "No ETag returned" }, { status: 500 });
    }

    return Response.json({ etag: response.ETag }, { status: 200 });
  } catch (error) {
    console.error("Part error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
