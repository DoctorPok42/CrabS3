import { getPublicFolder } from "@/lib/files";
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

    const folder = await getPublicFolder(folderId);

    return Response.json(folder, {
      status: 200,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
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
