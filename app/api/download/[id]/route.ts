import { s3Hot, s3Cold, HOT_BUCKET, COLD_BUCKET, META_BUCKET } from "@/services/s3.service";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;

    let metadata: { filename?: string; contentType?: string; maxDownloads?: string };
    try {
      const metadataResponse = await s3Hot.send(new GetObjectCommand({
        Bucket: META_BUCKET,
        Key: fileId + ".metadata.json",
      }));

      if (!metadataResponse.Body) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      const metadataChunks: Buffer[] = [];
      for await (const chunk of metadataResponse.Body as AsyncIterable<Buffer>) {
        metadataChunks.push(chunk);
      }
      metadata = JSON.parse(Buffer.concat(metadataChunks).toString("utf-8"));
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

        await s3Hot.send(new DeleteObjectsCommand({
          Bucket: META_BUCKET,
          Delete: {
            Objects: [
              { Key: fileId + ".metadata.json" },
            ],
          },
        }));
      } else {
        await s3Hot.send(new PutObjectCommand({
          Bucket: META_BUCKET,
          Key: fileId + ".metadata.json",
          Body: JSON.stringify({
            ...metadata,
            maxDownloads: newMaxDownloads.toString(),
          }),
          ContentType: "application/json",
        }));
      }
    }

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
      { status: error instanceof Error && error.message === "File not found" ? 404 : 500 }
    );
  }
}
