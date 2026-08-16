import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { log } from "@/services/log.service"
import { LogAction, LogLevel } from "@/types/log.types"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "Admin stats request",
    })

    const files = await prisma.files.findMany({
      select: {
        size: true,
        expires_at: true,
        user_id: true,
        max_downloads: true,
        download_count: true,
        storage: true,
        password_hash: true,
      },
    })

    const users = await prisma.users.findMany({
      select: {
        id: true,
      },
    })

    const secretsCount = await prisma.secrets.count()

    const now = new Date()
    let totalStorageUsed = 0
    let totalExpiredStorageSize = 0
    let totalActiveFiles = 0
    let totalFilesCount = 0
    let totalDownloads = 0
    let filesWithPassword = 0

    files.forEach((file) => {
      const size = Number(file.size)
      const isExpired =
        (file.expires_at && file.expires_at < now) ||
        (file.max_downloads && file.download_count && file.download_count >= file.max_downloads)

      totalStorageUsed += size
      totalFilesCount += 1
      totalDownloads += file.download_count || 0

      if (isExpired) {
        totalExpiredStorageSize += size
      } else {
        totalActiveFiles += 1
      }

      if (file.password_hash) {
        filesWithPassword += 1
      }
    })

    const averageFileSize = totalFilesCount > 0 ? Math.round(totalStorageUsed / totalFilesCount) : 0
    const usersWithFiles = new Set(files.map(f => f.user_id).filter(Boolean)).size

    return NextResponse.json({
      totalStorageUsed,
      expiredStorageSize: totalExpiredStorageSize,

      totalFiles: totalFilesCount,
      activeFiles: totalActiveFiles,
      averageFileSize,
      filesWithPassword,

      totalUsers: users.length,
      usersWithFiles,
      totalSecrets: secretsCount,

      totalDownloads,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    const session = await getSession()
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to fetch admin stats",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    })
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    )
  }
}
