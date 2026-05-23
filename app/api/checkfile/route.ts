import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    if (!folderId) {
      return Response.json({ error: "Missing folderId" }, { status: 400 });
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.DOWNLOAD,
      message: "Checking file availability",
      meta: { folderId }
    });

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
      },
    })

    if (!files || files.length === 0) {
      return Response.json({ exists: false, files: [] }, { status: 200 });
    }

    const validFiles = files.filter(file =>
      file.expires_at! > new Date() &&
      (file.max_downloads === null || file.download_count! < file.max_downloads)
    ).map(file => ({
      id: file.id,
      hasPassword: !!file.password_hash,
      filename: file.filename,
      size: Number(file.size),
      maxDownloads: file.max_downloads,
      downloadCount: file.download_count
    }));

    return Response.json({
      exists: validFiles.length > 0,
      files: validFiles
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Checkfile error:", errorMessage);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.DOWNLOAD,
      message: 'Failed to check file availability',
      meta: { error: errorMessage }
    });
    return Response.json({ error: "Internal server error: " + errorMessage }, { status: 500 });
  }
}
