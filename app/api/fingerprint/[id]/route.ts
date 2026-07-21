import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const fileId = request.url.split("/").pop();
    if (!fileId) {
      return new Response("File ID is required", { status: 400 });
    }

    const report = await prisma.download_events.findMany({
      where: {
        file_id: fileId,
      },
      select: {
        file_id: true,
        hash: true,
        ip: true,
        user_agent: true,
        created_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    if (!report) {
      return new Response("Report not found", { status: 404 });
    }

    return new Response(JSON.stringify(report), { status: 200 });
  } catch (error) {
    console.error("Error fetching download report:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
