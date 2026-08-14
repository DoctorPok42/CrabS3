import prisma from "@/lib/prisma";

export type PublicFile = {
  id: string;
  hasPassword: boolean;
  filename: string;
  size: number;
  maxDownloads: number | null;
  downloadCount: number | null;
  infectedBy: string | null;
  scannedAt: Date | null;
  expiresAt: Date | null;
  folderName: string | null;
};

export type FolderInfo = { exists: boolean; files: PublicFile[] };

export async function getPublicFolder(folderId: string): Promise<FolderInfo> {
  const files = await prisma.files.findMany({
    where: { folder_id: folderId },
    select: {
      id: true,
      password_hash: true,
      filename: true,
      size: true,
      expires_at: true,
      download_count: true,
      max_downloads: true,
      infected_by: true,
      scanned_at: true,
      folder: { select: { name: true } },
    },
  });

  if (!files || files.length === 0) return { exists: false, files: [] };

  const validFiles: PublicFile[] = files
    .filter(
      (file) =>
        file.expires_at! > new Date() &&
        (file.max_downloads === null || file.download_count! < file.max_downloads)
    )
    .map((file) => ({
      id: file.id,
      hasPassword: !!file.password_hash,
      filename: file.filename,
      size: Number(file.size),
      maxDownloads: file.max_downloads,
      downloadCount: file.download_count,
      infectedBy: file.infected_by,
      scannedAt: file.scanned_at,
      expiresAt: file.expires_at,
      folderName: file.folder?.name || null,
    }));

  return { exists: validFiles.length > 0, files: validFiles };
}
