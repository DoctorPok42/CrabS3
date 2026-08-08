import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const id = request.url.split("/").pop()?.split("?")[0];
    if (!id) {
      return new Response("File ID is required", { status: 400 });
    }
    const type = new URL(request.url).searchParams.get("type");
    if (!type?.includes("file") && !type?.includes("folder")) {
      return new Response("Invalid type. Must be 'file' or 'folder'.", { status: 400 });
    }


    let report;

    if (type === "file") {
      report = await prisma.download_events.findMany({
        where: {
          file_id: id,
        },
        select: {
          folder: { select: { name: true } },
          folder_id: true,
          file_id: true,
          hash: true,
          ip: true,
          user_agent: true,
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
      }).then((events) => {
        return events.map(event => ({
          folder_name: event.folder?.name || null,
          ...event,
          downloaded_at: event.created_at,
          created_at: undefined,
          folder: undefined,
        }));
      });

      if (!report) {
        return new Response("Report not found", { status: 404 });
      }
    } else if (type === "folder") {
      report = await prisma.download_events.findMany({
        where: {
          folder_id: id,
        },
        select: {
          folder: { select: { name: true } },
          folder_id: true,
          file_id: true,
          hash: true,
          ip: true,
          user_agent: true,
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
      }).then((events) => {
        return events.map(event => ({
          folder_name: event.folder?.name || null,
          ...event,
          downloaded_at: event.created_at,
          created_at: undefined,
          folder: undefined,
        }));
      });

      if (!report) {
        return new Response("Report not found", { status: 404 });
      }
    }

    return new Response(JSON.stringify(report), { status: 200 });
  } catch (error) {
    console.error("Error fetching download report:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
