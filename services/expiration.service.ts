import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";
import { AbortMultipartUploadCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const POLICY = (process.env.EXPIRED_FILE_POLICY || "cold").toLowerCase(); // "delete" | "cold"
const INCOMPLETE_UPLOAD_SCAN_LIMIT = 500;
const STALE_MULTIPART_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

const BATCH_LIMIT = 1000;
const CONCURRENCY = 5;

interface ExpiredFile {
  id: string;
  folder_id: string | null;
  filename: string;
}

function s3Key(file: ExpiredFile) {
  return `${file.folder_id}/${file.id}`;
}

async function deleteFile(file: ExpiredFile) {
  await s3Hot.send(new DeleteObjectCommand({ Bucket: HOT_BUCKET, Key: s3Key(file) })).catch(() => { });

  await prisma.$transaction([
    prisma.downloads.updateMany({ where: { file_id: file.id }, data: { file_id: null } }),
    prisma.download_events.updateMany({ where: { file_id: file.id }, data: { file_id: null } }),
    prisma.multipart_uploads.deleteMany({ where: { file_id: file.id } }),
    prisma.files.delete({ where: { id: file.id } }),
  ]);

  await log({
    level: LogLevel.INFO,
    action: LogAction.FILE_EXPIRED,
    message: `File ${file.filename} expired and deleted`,
    meta: { fileId: file.id, folderId: file.folder_id, policy: "delete" },
  });
}

async function markAsCold(file: ExpiredFile) {
  await prisma.files.update({
    where: { id: file.id },
    data: { storage: "cold" },
  });

  await log({
    level: LogLevel.INFO,
    action: LogAction.FILE_EXPIRED,
    message: `File ${file.filename} marked as cold in DB`,
    meta: { fileId: file.id, folderId: file.folder_id, policy: "cold" },
  });
}

async function deleteIncompleteUpload(file: ExpiredFile) {
  await prisma.$transaction([
    prisma.downloads.updateMany({ where: { file_id: file.id }, data: { file_id: null } }),
    prisma.download_events.updateMany({ where: { file_id: file.id }, data: { file_id: null } }),
    prisma.multipart_uploads.deleteMany({ where: { file_id: file.id } }),
    prisma.files.deleteMany({ where: { id: file.id } }),
  ]);

  await log({
    level: LogLevel.INFO,
    action: LogAction.FILE_EXPIRED,
    message: `Incomplete upload ${file.filename} removed`,
    meta: { fileId: file.id, folderId: file.folder_id, policy: "incomplete-upload" },
  });
}

async function processFile(file: ExpiredFile) {
  try {
    if (POLICY === "cold") {
      await markAsCold(file);
    } else {
      await deleteFile(file);
    }
  } catch (error) {
    await log({
      level: LogLevel.ERROR,
      action: LogAction.FILE_EXPIRED,
      message: `Failed to process expired file ${file.filename}`,
      meta: {
        fileId: file.id,
        folderId: file.folder_id,
        policy: POLICY,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export async function processExpiredFiles() {
  const expired = await prisma.files.findMany({
    where: {
      expires_at: { lt: new Date() },
      storage: "hot",
    },
    select: { id: true, folder_id: true, filename: true },
    orderBy: { expires_at: "asc" },
    take: BATCH_LIMIT,
  });

  for (let i = 0; i < expired.length; i += CONCURRENCY) {
    const slice = expired.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map(processFile));
  }

  const orphanedFiles = await prisma.files.findMany({
    where: {
      folder: null,
    },
    select: { id: true, folder_id: true, filename: true },
    orderBy: { uploaded_at: "asc" },
    take: BATCH_LIMIT,
  });

  for (let i = 0; i < orphanedFiles.length; i += CONCURRENCY) {
    const slice = orphanedFiles.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map(deleteFile));
  }

  return { processed: expired.length, policy: POLICY };
}

export async function cleanupIncompleteUploads() {
  const recentFiles = await prisma.files.findMany({
    where: {
      storage: "hot",
      uploaded_at: { not: null },
    },
    select: { id: true, folder_id: true, filename: true },
    orderBy: { uploaded_at: "desc" },
    take: INCOMPLETE_UPLOAD_SCAN_LIMIT,
  });

  if (recentFiles.length === 0) {
    return { processed: 0, removed: 0 };
  }

  const multipartUploads = await prisma.multipart_uploads.findMany({
    where: { file_id: { in: recentFiles.map((file) => file.id) } },
    select: { file_id: true },
  });

  const multipartFileIds = new Set(multipartUploads.map((upload) => upload.file_id));
  let removed = 0;

  for (const file of recentFiles) {
    if (multipartFileIds.has(file.id)) {
      continue;
    }

    const objectExists = await s3Hot.send(new HeadObjectCommand({
      Bucket: HOT_BUCKET,
      Key: s3Key(file),
    })).then(() => true).catch(() => false);

    if (!objectExists) {
      await deleteIncompleteUpload(file);
      removed++;
    }
  }

  return { processed: recentFiles.length, removed };
}

export async function reapStaleMultipartUploads() {
  const cutoff = new Date(Date.now() - STALE_MULTIPART_MAX_AGE_MS);

  const stale = await prisma.multipart_uploads.findMany({
    where: { created_at: { lt: cutoff } },
    take: BATCH_LIMIT,
  });

  let removed = 0;

  for (const pending of stale) {
    const key = `${pending.folder_id}/${pending.file_id}`;

    await s3Hot.send(new AbortMultipartUploadCommand({
      Bucket: HOT_BUCKET,
      Key: key,
      UploadId: pending.upload_id,
    })).catch(() => { });

    await prisma.$transaction([
      prisma.downloads.updateMany({ where: { file_id: pending.file_id }, data: { file_id: null } }),
      prisma.download_events.updateMany({ where: { file_id: pending.file_id }, data: { file_id: null } }),
      prisma.multipart_uploads.deleteMany({ where: { file_id: pending.file_id } }),
      prisma.files.deleteMany({ where: { id: pending.file_id, uploaded_at: null } }),
    ]).catch(() => { });

    removed++;
  }

  if (removed > 0) {
    await log({
      level: LogLevel.INFO,
      action: LogAction.FILE_EXPIRED,
      message: `Reaped ${removed} stale/abandoned multipart upload${removed > 1 ? "s" : ""}`,
      meta: { removed },
    });
  }

  return { processed: stale.length, removed };
}
