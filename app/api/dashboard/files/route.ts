import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const NULL_FOLDER_KEY = "__NULL__";

type DashboardType = "active" | "expired";

type FileStatusRow = {
  folder_id: string | null;
  expires_at: Date | null;
  max_downloads: number | null;
  download_count: number | null;
};

const toFolderKey = (folderId: string | null = null) => folderId ?? NULL_FOLDER_KEY;

const getDashboardType = (typeParam: string | null): DashboardType => (typeParam === "expired" ? "expired" : "active");

const isFileActive = (file: FileStatusRow, now: Date) => {
  const isDateExpired = file.expires_at ? new Date(file.expires_at) < now : true;
  const downloadCount = file.download_count ?? 0;
  const isDownloadLimitReached = file.max_downloads !== null && downloadCount >= file.max_downloads;
  return !(isDateExpired || isDownloadLimitReached);
};

const buildActiveFolderMap = (files: FileStatusRow[], now: Date) => {
  const activeFolderMap = new Map<string, boolean>();

  for (const file of files) {
    const folderKey = toFolderKey(file.folder_id);
    if (isFileActive(file, now)) {
      activeFolderMap.set(folderKey, true);
    } else if (!activeFolderMap.has(folderKey)) {
      activeFolderMap.set(folderKey, false);
    }
  }

  return activeFolderMap;
};

const buildFolderFilter = (orderedFolderIds: Array<string | null>) => {
  const nonNullFolderIds = orderedFolderIds.filter((id): id is string => id !== null);
  const hasNullFolder = orderedFolderIds.includes(null);

  if (hasNullFolder && nonNullFolderIds.length > 0) {
    return {
      OR: [
        { folder_id: { in: nonNullFolderIds } },
        { folder_id: null },
      ],
    };
  }

  if (hasNullFolder) {
    return { folder_id: null };
  }

  return { folder_id: { in: nonNullFolderIds } };
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") || "1");
  const limit = Math.min(Number.parseInt(searchParams.get("limit") || "10"), 200);
  const type = getDashboardType(searchParams.get("type"));
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;

  const where = {
    user_id: session.userId,
    uploaded_at: { not: null },
  };

  const [allFolderGroups, filesForStatus] = await Promise.all([
    prisma.files.groupBy({
      by: ["folder_id"],
      where,
      _max: { uploaded_at: true },
      orderBy: {
        _max: {
          uploaded_at: "desc",
        },
      },
    }),
    prisma.files.findMany({
      where,
      select: {
        folder_id: true,
        expires_at: true,
        max_downloads: true,
        download_count: true,
      },
    }),
  ]);

  const now = new Date();
  const activeFolderMap = buildActiveFolderMap(filesForStatus as FileStatusRow[], now);

  const filteredFolderIds = allFolderGroups
    .map((group) => group.folder_id)
    .filter((folderId) => {
      const hasActiveFile = activeFolderMap.get(toFolderKey(folderId)) ?? false;
      return type === "active" ? hasActiveFile : !hasActiveFile;
    });

  const orderedFolderIds = filteredFolderIds.slice((safePage - 1) * safeLimit, safePage * safeLimit);

  if (orderedFolderIds.length === 0) {
    return Response.json({
      files: [],
      isAdmin: session.isAdmin,
      page: safePage,
      totalPages: Math.ceil(filteredFolderIds.length / safeLimit),
    });
  }

  const folderFilter = buildFolderFilter(orderedFolderIds);

  const files = await prisma.files.findMany({
    where: {
      ...where,
      ...folderFilter,
    },
    include: {
      folder: {
        select: { id: true, name: true, shared_folders: true },
      },
    },
    orderBy: { uploaded_at: "desc" },
  }) as unknown as Array<{
    folder: { id: string; name: string; shared_folders: unknown } | null;
    folder_id: string | null;
    uploaded_at: Date | null;
    size: string | number;
    expires_at: Date | null;
    download_count: number;
    max_downloads: number | null;
    password_hash: string | null;
    is_expired?: boolean;
    is_download_limit_reached?: boolean;
    has_password?: boolean;
    infected?: boolean;
    infected_by?: string | null;
    scanned_at?: Date | null;
  }>

  const folderOrder = new Map<string, number>();
  orderedFolderIds.forEach((folderId, index) => {
    folderOrder.set(toFolderKey(folderId), index);
  });

  files.sort((a, b) => {
    const aIndex = folderOrder.get(toFolderKey(a.folder_id)) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = folderOrder.get(toFolderKey(b.folder_id)) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) return aIndex - bIndex;

    const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
    const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
    return bTime - aTime;
  });

  for (const file of files) {
    file.is_expired = file.expires_at ? file.expires_at < now : false;
    file.is_download_limit_reached = file.max_downloads ? file.download_count >= file.max_downloads : false;
    file.has_password = !!file.password_hash;
    file.size = Number(file.size);
    file.infected = !!file.infected;
    file.infected_by = file.infected_by || null;
    file.scanned_at = file.scanned_at || null;
  }

  return Response.json({
    files,
    isAdmin: session.isAdmin,
    page: safePage,
    totalPages: Math.ceil(filteredFolderIds.length / safeLimit),
  });
}
