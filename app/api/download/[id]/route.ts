import s3 from "@/services/s3.service";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const getFileData = async (fileId: string) => {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileId,
    }));

    if (!response.Body) {
      throw new Error("File not found");
    }

    const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }

    const data = Buffer.concat(chunks);

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") {
      throw new Error("File not found");
    }
    throw error;
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;

    let metadata: { filename?: string; contentType?: string; maxDownloads?: string };
    try {
      const metadataResponse = await s3.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
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

    const fileData = await getFileData(fileId);

    if (metadata.maxDownloads) {
      const maxDownloads = Number.parseInt(metadata.maxDownloads);
      if (Number.isNaN(maxDownloads) || maxDownloads <= 0) {
        return Response.json({ error: "Invalid max downloads value" }, { status: 500 });
      }

      const newMaxDownloads = maxDownloads - 1;

      if (newMaxDownloads === 0) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Delete: {
            Objects: [
              { Key: fileId },
              { Key: fileId + ".metadata.json" },
            ],
          },
        }));
      } else {
        await s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: fileId + ".metadata.json",
          Body: JSON.stringify({
            ...metadata,
            maxDownloads: newMaxDownloads.toString(),
          }),
          ContentType: "application/json",
        }));
      }
    }

    return new Response(fileData, {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${metadata.filename || "download"}"`,
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
