import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logsWhereInput } from "@/prisma/app/generated/prisma/models";

export async function GET(request: Request) {
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
