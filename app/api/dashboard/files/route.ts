import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") || "1");
  const limit = Math.min(Number.parseInt(searchParams.get("limit") || "10"), 200);

  const where = { user_id: session.userId };

  const [files, totalCount] = await Promise.all([
    prisma.files.findMany({
      where,
      orderBy: { uploaded_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }) as unknown as Array<{
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
    }>,
    prisma.files.count({ where }),
  ]);

  const now = new Date();
  for (const file of files) {
    file.is_expired = file.expires_at ? file.expires_at < now : false;
    file.is_download_limit_reached = file.max_downloads ? file.download_count >= file.max_downloads : false;
    file.has_password = !!file.password_hash;
    file.size = Number(file.size);
    file.infected = !!file.infected;
    file.infected_by = file.infected_by || null;
    file.scanned_at = file.scanned_at || null;
  }

  return Response.json({ files, isAdmin: session.isAdmin, page, totalPages: Math.ceil(totalCount / limit) });
}
