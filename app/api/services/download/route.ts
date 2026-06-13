import prisma from "@/lib/prisma";
import { checkTokenService } from "@/lib/service";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const verifiedToken = await checkTokenService(token || "");
    if (!verifiedToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    const folerId = request.headers.get("X-Folder-Id") || null;
    const linkType = request.headers.get("X-Link-Type") || "url";
    if (!folerId) {
      return new Response("X-Folder-Id header is required", { status: 400 });
    }

    const files = await prisma.files.findMany({
      where: {
        service_id: Number.parseInt(verifiedToken.id),
        folder_id: folerId,
      },
    });
    if (!files) {
      return new Response("No files found", { status: 404 });
    }

    if (linkType === "url") {
      return Response.json({
        url: process.env["BASE_URL"] + `/files/${folerId}`,
      });
    } else if (linkType === "direct") {
      const s3Objects = await s3Hot.send(
        new ListObjectsV2Command({
          Bucket: HOT_BUCKET,
          Prefix: folerId + "/",
        })
      )

      const files = await Promise.all(
        s3Objects.Contents?.map(async (file) => {
          const [url, meta] = await Promise.all([
            getSignedUrl(
              s3Hot,
              new GetObjectCommand({
                Bucket: HOT_BUCKET,
                Key: file.Key
              }),
              { expiresIn: 3600 }
            ),
            prisma.files.findUnique({
              where: { id: file.Key?.split("/")[1] },
              select: {
                filename: true,
                size: true,
                content_type: true,
                scanned_at: true,
                infected: true,
                expires_at: true
              },
            }),
          ])
          return { ...meta, url };
        }) ?? []
      )

      return Response.json({ files });
    }
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
