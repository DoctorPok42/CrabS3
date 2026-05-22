import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction } from "@/types/log.types";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const id = Number(pathname.split("/").slice(-3)[1]);

    const { quota } = await request.json();
    if (typeof quota !== "number" || Number.isNaN(quota) || quota < -1) {
      return Response.json({ error: "Invalid quota value" }, { status: 400 });
    }

    const user = await prisma.users.update({
      where: { id: id },
      data: { quota: quota },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    await log({
      action: LogAction.ADMIN_ACTION,
      message: `Admin updated quota for user ${id} to ${quota} bytes`,
      userId: session.user.id,
      meta: { targetUserId: id, quota, ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
    });

    return Response.json({ message: "Quota updated successfully", quota: user.quota.toString() });
  } catch (error) {
    console.error("Error updating quota:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
