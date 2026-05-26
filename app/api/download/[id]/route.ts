import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import bcrypt from "bcrypt";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const password = await request.json().then(data => data.password).catch(() => null);

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.DOWNLOAD,
      message: "Download validation request",
      meta: { folderId, fileId, hasPassword: !!password }
    });

    try {
      if (fileId) {
        const file = await prisma.files.findUnique({
          where: { id: fileId },
          select: { folder_id: true, password_hash: true, filename: true, size: true, max_downloads: true, download_count: true, expires_at: true, scanned_at: true, infected: true },
        });

        if (!file) {
          return Response.json({ error: "File not found" }, { status: 404 });
        }

        if (file.folder_id !== folderId) {
          return Response.json({ error: "File not found" }, { status: 404 });
        }

        if (file.expires_at! < new Date()) {
          await s3Hot.send(new DeleteObjectCommand({
            Bucket: HOT_BUCKET,
            Key: `${folderId}/${fileId}`,
          })).catch(console.error);

          await log({
            action: LogAction.FILE_EXPIRED,
            message: `File ${file.filename} has expired and was deleted`,
            meta: { folderId, fileId, ip: getIp(request) },
          })

          return Response.json({ error: "File has expired" }, { status: 410 });
        }

        if (file.infected) {
          await log({
            level: LogLevel.WARN,
            action: LogAction.DOWNLOAD,
            message: `Download blocked — infected file: ${file.filename}`,
            meta: { folderId, fileId, ip: getIp(request) }
          });
          return Response.json(
            { error: "This file has been removed for security reasons." },
            { status: 411 }
          );
        }

        if (!file.scanned_at && !file.infected) {
          return Response.json(
            { error: "File is pending security scan, please retry in a few seconds." },
            { status: 202 }
          );
        }

        if (file.max_downloads !== null && file.download_count! >= file.max_downloads) {
          await s3Hot.send(new DeleteObjectCommand({
            Bucket: HOT_BUCKET,
            Key: `${folderId}/${fileId}`,
          })).catch(console.error);
          return Response.json({ error: "Download limit exceeded" }, { status: 410 });
        }

        if (file.password_hash) {
          if (!password) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const isPasswordValid = await bcrypt.compare(password, file.password_hash);
          if (!isPasswordValid) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
        }
      } else {
        const files = await prisma.files.findMany({
          where: { folder_id: folderId },
          select: { id: true, password_hash: true, expires_at: true, max_downloads: true, download_count: true },
        });

        if (files.length === 0) {
          return Response.json({ error: "Folder not found" }, { status: 404 });
        }

        const hasPasswordProtected = files.some(f => f.password_hash);
        if (hasPasswordProtected && !password) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (hasPasswordProtected) {
          const firstProtectedFile = files.find(f => f.password_hash) as { password_hash: string };
          if (firstProtectedFile) {
            const isPasswordValid = await bcrypt.compare(password, firstProtectedFile.password_hash);
            if (!isPasswordValid) {
              return Response.json({ error: "Unauthorized" }, { status: 401 });
            }
          }
        }

        for (const file of files) {
          if (file.expires_at! < new Date()) {
            await s3Hot.send(new DeleteObjectCommand({
              Bucket: HOT_BUCKET,
              Key: `${folderId}/${file.id}`,
            })).catch(console.error);
            return Response.json({ error: "One or more files have expired" }, { status: 410 });
          }

          if (file.max_downloads !== null && file.download_count! >= file.max_downloads) {
            await s3Hot.send(new DeleteObjectCommand({
              Bucket: HOT_BUCKET,
              Key: `${folderId}/${file.id}`,
            })).catch(console.error);
            return Response.json({ error: "Download limit exceeded for one or more files" }, { status: 410 });
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        return Response.json({ error: "File not found" }, { status: 404 });
      }
      throw error;
    }

    return Response.json({ status: 200 }, { status: 200 });
  } catch (error) {
    console.error(error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.DOWNLOAD,
      message: "Download validation failed",
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
