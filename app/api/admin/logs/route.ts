import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logsWhereInput } from "@/prisma/app/generated/prisma/models";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || undefined;
    const action = searchParams.get("action") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 200);

    await log({
      level: LogLevel.DEBUG,
      action: LogAction.ADMIN_ACTION,
      message: "Admin logs query",
      userId: session.user.id,
      meta: { level, action, userId, page, limit }
    });

    const where = {
      ...(level && { level: level as any }),
      ...(action && { action: action as any }),
      ...(userId && { user_id: userId }),
      ...((from || to) && {
        created_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    } as logsWhereInput;

    const [logs, total] = await Promise.all([
      prisma.logs.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, email: true } } },
      }),
      prisma.logs.count({ where }),
    ]);

    return Response.json({ logs, total, page, limit });
  } catch (error) {
    console.error("Error fetching logs:", error);
    const session = await getSession();
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to fetch admin logs",
      userId: session?.user.id,
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const { minLevel } = await request.json();
  const valid = ["DEBUG", "INFO", "WARN", "ERROR"];
  if (!valid.includes(minLevel)) {
    return Response.json({ error: "Invalid level" }, { status: 400 });
  }

  process.env.LOG_MIN_LEVEL = minLevel;

  return Response.json({ message: "Log level updated" });
}
