import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { verifyUploadToken } from "@/lib/upload-token";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("X-Upload-Token");
    const partNumber = request.headers.get("X-Part-Number");

    if (!token || !partNumber) {
      return Response.json({ error: "Missing required headers" }, { status: 400 });
    }

    const payload = verifyUploadToken(token);
    if (!payload) {
      return Response.json({ error: "Invalid or expired upload token" }, { status: 401 });
    }

    if (!request.body) {
      return Response.json({ error: "Empty body" }, { status: 400 });
    }

    const { fid: fileId, fol: folderId, upl: uploadId } = payload;

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return Response.json({ error: "Empty part" }, { status: 400 });
    }

    const response = await s3Hot.send(
      new UploadPartCommand({
        Bucket: HOT_BUCKET,
        Key: folderId + "/" + fileId,
        UploadId: uploadId,
        PartNumber: Number.parseInt(partNumber),
        Body: buffer,
        ContentLength: buffer.length
      }),
      {
        abortSignal: AbortSignal.timeout(280_000),
        requestTimeout: 280_000,
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
