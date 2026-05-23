import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "Admin users list request",
      userId: session.user.id,
    });

    const currentUser = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        quota: true,
        files: {
          select: {
            size: true,
            expires_at: true,
            download_count: true,
            max_downloads: true,
          }
        },
        secrets: {
          select: {
            id: true,
          }
        }
      },
    }) as unknown as {
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
      createdAt: Date;
      quota: number;
      files: {
        size: number;
        expires_at: Date;
        download_count: number;
        max_downloads: number | null;
      }[],
      secrets: {
        id: string;
      }[]
    }[];

    const usersWithMetrics = users.map((user) => {
      const now = new Date();

      const activeFiles = user.files.filter((file) => {
        const isNotExpired = file.expires_at && new Date(file.expires_at) > now;
        const hasDownloadsAvailable =
          file.max_downloads === null || file.download_count < file.max_downloads;

        return isNotExpired && hasDownloadsAvailable;
      });

      const totalSize = activeFiles.reduce((sum, file) => sum + Number(file.size), 0);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        quota: JSON.parse(user.quota as unknown as string) || 0,
        isAdmin: user.isAdmin,
        totalSize,
        activeFiles: activeFiles.length,
        totalFiles: user.files.length,
        totalSecrets: user.secrets.length,
        status: "active",
      };
    });

    const pendingInvitations = await prisma.invitation.findMany({
      where: { usedAt: null },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    const pendingUsersWithMetrics = pendingInvitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      name: null,
      isAdmin: false,
      totalSize: 0,
      activeFiles: 0,
      totalFiles: 0,
      totalSecrets: 0,
      quota: 0,
      status: "pending",
    }));

    const allUsers = [...usersWithMetrics, ...pendingUsersWithMetrics];

    return Response.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    const session = await getSession();
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to fetch users list",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
