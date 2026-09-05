import * as net from "node:net";
import { Readable, Transform, pipeline } from "node:stream";
import { promisify } from "node:util";
import { s3Hot, HOT_BUCKET } from "@/services/s3.service";
import { GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { Settings } from "@/services/settings.service";

const pipelineAsync = promisify(pipeline);

const CLAMAV_HOST = process.env.CLAMAV_HOST || "localhost";
const CLAMAV_PORT = Number.parseInt(process.env.CLAMAV_PORT || "3310");

const SCAN_TIMEOUT_MS = Number.parseInt(process.env.CLAMAV_SCAN_TIMEOUT_MS || "300000");

async function getMaxScanBytes(): Promise<number | null> {
  try {
    const configured = await Settings.clamavMaxScanSize();
    if (configured > 0) return configured;
    return null;
  } catch {
    return process.env.CLAMAV_MAX_SCAN_SIZE
      ? Number.parseInt(process.env.CLAMAV_MAX_SCAN_SIZE)
      : null;
  }
}

function sanitizeString(str: string | null) {
  if (!str) return null;
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function isTransientConnError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EPIPE";
}

function instreamFramer(): Transform {
  return new Transform({
    transform(chunk: Buffer, _enc, callback) {
      const sizeHeader = Buffer.alloc(4);
      sizeHeader.writeUInt32BE(chunk.length, 0);
      this.push(sizeHeader);
      this.push(chunk);
      callback();
    },
    flush(callback) {
      const end = Buffer.alloc(4);
      end.writeUInt32BE(0, 0);
      this.push(end);
      callback();
    },
  });
}

async function scanStream(source: Readable): Promise<{ isInfected: boolean; virus: string | null }> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = "";
    let settled = false;

    const done = (result: { isInfected: boolean; virus: string | null } | Error) => {
      if (settled) return;
      settled = true;
      source.destroy();
      socket.destroy();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    socket.setTimeout(SCAN_TIMEOUT_MS);
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

      pipelineAsync(source, instreamFramer(), socket).catch((err) => {
        done(err instanceof Error ? err : new Error(String(err)));
      });
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
  if (!(await Settings.clamavEnabled())) {
    await prisma.files.update({
      where: { id: fileId },
      data: { scanned_at: new Date() },
    }).catch(() => null);
    return;
  }

  const maxScanBytes = await getMaxScanBytes();

  if (maxScanBytes !== null) {
    const fileRow = await prisma.files.findUnique({ where: { id: fileId }, select: { size: true } }).catch(() => null);

    if (fileRow && fileRow.size > BigInt(maxScanBytes)) {
      await prisma.files.update({
        where: { id: fileId },
        data: { scanned_at: new Date() },
      });
      await log({
        level: LogLevel.INFO,
        action: LogAction.UPLOAD,
        message: `Skipped virus scan for "${filename}" - exceeds the configured ${(maxScanBytes / (1024 * 1024 * 1024)).toFixed(1)} GB scan limit`,
        userId,
        meta: { folderId, fileId, filename, ip, sizeBytes: fileRow.size.toString() },
      });
      return;
    }
  }

  const SCAN_ATTEMPTS = 3;
  let result: { isInfected: boolean; virus: string | null } | undefined;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= SCAN_ATTEMPTS; attempt++) {
    let fileResponse;
    try {
      fileResponse = await s3Hot.send(new GetObjectCommand({
        Bucket: HOT_BUCKET,
        Key: `${folderId}/${fileId}`,
      }));
    } catch (err) {
      console.error("File not found in S3:", err);
      return;
    }

    if (!fileResponse?.Body) {
      console.error("Empty body from S3");
      return;
    }

    try {
      result = await scanStream(fileResponse.Body as Readable);
      break;
    } catch (err) {
      lastErr = err;

      if (!isTransientConnError(err) || attempt === SCAN_ATTEMPTS) break;

      console.warn(`ClamAV connection issue (attempt ${attempt}/${SCAN_ATTEMPTS}), retrying: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  if (!result) {
    const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
    console.error(`ClamAV scan failed for "${filename}": ${message}`);

    await prisma.files.update({
      where: { id: fileId },
      data: { scanned_at: new Date(), scan_result: "ERROR" },
    }).catch(() => null);

    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: `ClamAV scan failed for "${filename}": ${message}`,
      userId,
      meta: { folderId, fileId, ip, error: message },
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

    if (await Settings.clamavDeleteInfected()) {
      await s3Hot.send(new DeleteObjectsCommand({
        Bucket: HOT_BUCKET,
        Delete: { Objects: [{ Key: `${folderId}/${fileId}` }] },
      }));
    }

    await prisma.files.update({
      where: { id: fileId },
      data: { infected: true, infected_by: sanitizedVirus ?? "unknown", scan_result: "INFECTED", scanned_at: new Date() },
    });
  } else {
    await prisma.files.update({
      where: { id: fileId },
      data: { scanned_at: new Date(), scan_result: "CLEAN" },
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
