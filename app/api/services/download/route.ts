import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { checkTokenService } from "@/lib/service";
import { log } from "@/services/log.service";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const verifiedToken = await checkTokenService(token || "");
    if (!verifiedToken) {
      (async () => {
        log({
          level: LogLevel.WARN,
          action: LogAction.SERVICE_DOWNLOAD,
          message: `Unauthorized download attempt`,
          meta: { ip: getIp(request) }
        })
      })();
      return new Response("Unauthorized", { status: 401 });
    }

    const service = await prisma.services.findUnique({
      where: { id: Number.parseInt(verifiedToken.id) },
      select: { folder_id: true }
    });
    if (!service) {
      return new Response("Service not found", { status: 404 });
    }

    const folerId = service.folder_id;
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
      (async () => {
        log({
          level: LogLevel.INFO,
          action: LogAction.SERVICE_DOWNLOAD,
          message: `Service with ID ${verifiedToken.id} downloaded files from folder ${folerId}`,
          userId: Number.parseInt(verifiedToken.id),
          meta: { folderId: folerId, downloadType: linkType, ip: getIp(request) }
        })
      })();

      return Response.json({
        url: process.env["BASE_URL"] + `/file/${folerId}`,
      });
    } else if (linkType === "direct") {
      (async () => {
        log({
          level: LogLevel.INFO,
          action: LogAction.SERVICE_DOWNLOAD,
          message: `Service with ID ${verifiedToken.id} downloaded files from folder ${folerId}`,
          userId: Number.parseInt(verifiedToken.id),
          meta: { folderId: folerId, downloadType: linkType, ip: getIp(request) }
        })
      })();

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
    } else {
      (async () => {
        log({
          level: LogLevel.WARN,
          action: LogAction.SERVICE_DOWNLOAD,
          message: `Invalid link type: ${linkType}`,
          userId: Number.parseInt(verifiedToken.id),
          meta: { folderId: folerId, downloadType: linkType, ip: getIp(request) }
        })
      })();
      return new Response("Invalid link type", { status: 400 });
    }
  } catch (error) {
    (async () => {
      log({
        level: LogLevel.ERROR,
        action: LogAction.SERVICE_DOWNLOAD,
        message: `Failed to download files: ${error}`,
        meta: { ip: getIp(request) }
      })
    })();

    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
