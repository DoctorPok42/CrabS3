import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const id = Number(pathname.split("/").pop());

    if (session.user.id !== id && !session.user.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.users.findUnique({
      where: { id: id },
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
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const activeFiles = user.files.filter((file: any) => {
      const isNotExpired = file.expires_at && new Date(file.expires_at) > now;
      const hasDownloadsAvailable =
        file.max_downloads === null || file.download_count < file.max_downloads;

      return isNotExpired && hasDownloadsAvailable;
    });

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      quota: String(user.quota),
      totalFiles: user.files.length,
      activeFiles: activeFiles.length,
      totalSecrets: user.secrets.length,
      sizeUsed: activeFiles.reduce((acc: number, file: any) => acc + Number(file.size), 0),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const id = Number(pathname.split("/").pop());

    if (session.user.id !== id && !session.user.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.users.delete({
      where: { id: id },
    });

    return Response.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
