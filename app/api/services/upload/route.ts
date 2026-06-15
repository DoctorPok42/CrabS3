import prisma from "@/lib/prisma";
import { checkTokenService } from "@/lib/service";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { randomUUID } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";

export async function POST(request: Request) {
  try {
    const filename = request.headers.get("X-Filename");
    const folderId = request.headers.get("X-Folder-Id") || randomUUID();
    const fileSize = request.headers.get("X-File-Size");
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const verifiedToken = await checkTokenService(token || "");
    if (!verifiedToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!filename || !fileSize) {
      return new Response("No file or filename provided", { status: 400 });
    }

    const fileSizeBytes = BigInt(fileSize);

    const service = await prisma.services.findUnique({
      where: { id: Number.parseInt(verifiedToken.id) },
      select: { quota: true, id: true, status: true },
    });
    if (!service) {
      return new Response("Service not found", { status: 404 });
    }

    const serviceFiles = await prisma.files.aggregate({
      where: { service_id: Number.parseInt(verifiedToken.id) },
      _sum: { size: true },
    });

    const currentUsage = serviceFiles._sum.size || BigInt(0);
    const totalUsage = currentUsage + fileSizeBytes;

    if (service?.quota !== BigInt(-1) && totalUsage > service.quota) {
      const quotaGB = Number(service?.quota) / (1024 * 1024 * 1024);
      const usedGB = Number(currentUsage) / (1024 * 1024 * 1024);
      const fileGB = Number(fileSizeBytes) / (1024 * 1024 * 1024);
      (async () => {
        log({
          level: LogLevel.WARN,
          action: LogAction.SERVICE_UPLOAD,
          message: `Service ${verifiedToken.id} exceeded quota. Used: ${usedGB.toFixed(2)} GB, Quota: ${quotaGB.toFixed(2)} GB, File Size: ${fileGB.toFixed(2)} GB`,
          userId: Number.parseInt(verifiedToken.id),
        });
      })();

      return new Response(
        `Exceeded quota. You have used ${usedGB.toFixed(2)} GB / ${quotaGB.toFixed(2)} GB. This file is ${fileGB.toFixed(2)} GB.`,
        { status: 413 }
      );
    }

    if (service.status !== "ACTIVE") {
      log({
        level: LogLevel.WARN,
        action: LogAction.SERVICE_UPLOAD,
        message: `Service ${verifiedToken.id} attempted to upload while inactive.`,
        userId: Number.parseInt(verifiedToken.id),
      });
      return new Response("Service is not active", { status: 403 });
    }

    const fileId = randomUUID();

    const url = await getSignedUrl(
      s3Hot,
      new GetObjectCommand({
        Bucket: HOT_BUCKET,
        Key: `${folderId}/${fileId}`,
      }), {
      expiresIn: 3600,
    }
    );

    await prisma.files.create({
      data: {
        id: fileId,
        folder_id: folderId,
        filename: filename,
        size: fileSizeBytes,
        service_id: Number.parseInt(verifiedToken.id),
        type: "SERVICE",
        content_type: contentType,
      },
    });

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.SERVICE_UPLOAD,
        message: `Uploading file(s): ${filename}`,
        userId: Number.parseInt(verifiedToken.id),
      });
    })();

    return new Response(
      JSON.stringify({
        url,
        fileId,
        folderId,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
