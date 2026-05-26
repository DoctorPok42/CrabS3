import * as net from "node:net";
import { s3Hot, s3Cold, HOT_BUCKET, COLD_BUCKET } from "@/services/s3.service";
import { GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

const CLAMAV_HOST = process.env.CLAMAV_HOST || "localhost";
const CLAMAV_PORT = Number.parseInt(process.env.CLAMAV_PORT || "3310");

function sanitizeString(str: string | null) {
  if (!str) return null;
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

async function scanBuffer(buffer: Buffer): Promise<{ isInfected: boolean; virus: string | null }> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = "";
    let settled = false;

    const done = (result: { isInfected: boolean; virus: string | null } | Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    socket.setTimeout(30000);
    socket.on("timeout", () => done(new Error("ClamAV timeout")));
    socket.on("error", (err) => done(err));
    socket.on("data", (chunk) => { response += chunk.toString(); });
    socket.on("end", () => {
      const line = response.trim();

      if (line.includes("OK") && !line.includes("FOUND")) {
        done({ isInfected: false, virus: null });
      } else if (line.includes("FOUND")) {
        const virus = line.replace("stream:", "").replace("FOUND", "").trim();
        done({ isInfected: true, virus });
      } else if (line.includes("ERROR")) {
        done(new Error(`ClamAV error: ${line}`));
      } else {
        done(new Error(`Unexpected ClamAV response: ${line}`));
      }
    });

    socket.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      socket.write("zINSTREAM\0");

      const CHUNK_SIZE = 4096;
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
        const sizeHeader = Buffer.alloc(4);
        sizeHeader.writeUInt32BE(chunk.length, 0);
        socket.write(sizeHeader);
        socket.write(chunk);
      }

      const end = Buffer.alloc(4);
      end.writeUInt32BE(0, 0);
      socket.write(end);
    });
  });
}

export async function handleScanResult(
  folderId: string,
  fileId: string,
  filename: string,
  userId?: number,
  ip?: string,
): Promise<void> {
  let fileResponse;
  try {
    fileResponse = await s3Hot.send(new GetObjectCommand({
      Bucket: HOT_BUCKET,
      Key: `${folderId}/${fileId}`,
    }));
  } catch {
    try {
      fileResponse = await s3Cold.send(new GetObjectCommand({
        Bucket: COLD_BUCKET,
        Key: `${folderId}/${fileId}`,
      }));
    } catch (err) {
      console.error("File not found in S3:", err);
      return;
    }
  }

  if (!fileResponse?.Body) {
    console.error("Empty body from S3");
    return;
  }

  const bytes = await fileResponse.Body.transformToByteArray();
  const buffer = Buffer.from(bytes);

  let result: { isInfected: boolean; virus: string | null };
  try {
    result = await scanBuffer(buffer);
  } catch (err) {
    console.error(`ClamAV scan failed for "${filename}": ${(err as Error).message}`);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: `ClamAV scan failed for "${filename}": ${(err as Error).message}`,
      userId,
      meta: { folderId, fileId, ip, error: String(err) },
    });
    return;
  }

  if (result.isInfected) {
    const sanitizedVirus = sanitizeString(result.virus);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: `Virus detected in "${filename}": ${sanitizedVirus}`,
      userId,
      meta: { folderId, fileId, ip, filename, virus: sanitizedVirus },
    });

    await Promise.allSettled([
      s3Hot.send(new DeleteObjectsCommand({
        Bucket: HOT_BUCKET,
        Delete: { Objects: [{ Key: `${folderId}/${fileId}` }] },
      })),
      s3Cold.send(new DeleteObjectsCommand({
        Bucket: COLD_BUCKET,
        Delete: { Objects: [{ Key: `${folderId}/${fileId}` }] },
      })),
    ]);

    await prisma.files.update({
      where: { id: fileId },
      data: { infected: true, infected_by: sanitizedVirus ?? "unknown" },
    });
  } else {
    await prisma.files.update({
      where: { id: fileId },
      data: { scanned_at: new Date() },
    });
    await log({
      level: LogLevel.DEBUG,
      action: LogAction.UPLOAD,
      message: `File "${filename}" passed virus scan`,
      userId,
      meta: { folderId, fileId, filename, ip },
    });
  }
}