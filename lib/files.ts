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
  folder: {
    id: string | null;
    name: string | null;
    shared_folders: { id: string; name: string | null }[];
  };
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
      folder: { select: { id: true, name: true, shared_folders: true } },
    },
  });

  if (!files || files.length === 0) return { exists: false, files: [] };

  const sharedFoldersNames = await prisma.folders.findMany({
    where: { id: { in: files.flatMap((file) => file.folder?.shared_folders ?? []).filter((id): id is string => !!id) } },
    select: { id: true, name: true },
  });

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
      folder: {
        id: file.folder?.id || null,
        name: file.folder?.name || null,
        shared_folders: sharedFoldersNames
          .filter((f) => file.folder?.shared_folders?.toLocaleString().includes(f.id))
          .map((f) => f)
      },
    })) as PublicFile[];

  return { exists: validFiles.length > 0, files: validFiles };
}
