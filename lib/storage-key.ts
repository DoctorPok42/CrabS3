import prisma from "@/lib/prisma";
import { HOT_BUCKET, s3Hot } from "@/services/s3.service";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export interface StorageKeyed {
  id: string;
  folder_id: string | null;
  storage_key?: string | null;
}

export function resolveStorageKey(file: StorageKeyed): string | null {
  if (file.storage_key) return file.storage_key;
  if (file.folder_id) return `${file.folder_id}/${file.id}`;
  return null;
}

export async function deleteStorageObjectIfUnreferenced(
  file: StorageKeyed,
  bucket: string = HOT_BUCKET
): Promise<boolean> {
  const key = resolveStorageKey(file);
  if (!key) return false;

  const stillReferenced = await prisma.files.findFirst({
    where: { storage_key: key, id: { not: file.id } },
    select: { id: true },
  });

  if (stillReferenced) return false;

  await s3Hot.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => { });
  return true;
}

export async function deleteFilesAndReclaimStorage(
  files: StorageKeyed[],
  bucket: string = HOT_BUCKET
): Promise<number> {
  if (files.length === 0) return 0;

  const fileIds = files.map((f) => f.id);

  await prisma.$transaction([
    prisma.downloads.updateMany({ where: { file_id: { in: fileIds } }, data: { file_id: null } }),
    prisma.download_events.updateMany({ where: { file_id: { in: fileIds } }, data: { file_id: null } }),
    prisma.multipart_uploads.deleteMany({ where: { file_id: { in: fileIds } } }),
    prisma.files.deleteMany({ where: { id: { in: fileIds } } }),
  ]);

  const uniqueKeys = new Set(files.map((f) => resolveStorageKey(f)).filter((k): k is string => !!k));

  for (const key of uniqueKeys) {
    const stillReferenced = await prisma.files.findFirst({
      where: { storage_key: key },
      select: { id: true },
    });

    if (!stillReferenced) {
      await s3Hot.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => { });
    }
  }

  return files.length;
}