import crypto from "node:crypto";
import { cleanOldSessions, cleanupIncompleteUploads, processExpiredFiles, reapStaleMultipartUploads } from "@/services/expiration.service";
import { log, purgeOldLogs } from "@/services/log.service";
import { Settings } from "@/services/settings.service";
import { LogAction, LogLevel } from "@/types/log.types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 280;

function isValidSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = request.headers.get("X-Cron-Secret");

  if (!isValidSecret(secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await Settings.cleanupEnabled())) {
      return Response.json({ status: "skipped", reason: "automatic cleanup is disabled" }, { status: 200 });
    }

    await cleanupIncompleteUploads();
    const reaped = await reapStaleMultipartUploads();
    const result = await processExpiredFiles();
    const purgedLogs = await purgeOldLogs();
    const sessionCleanup = await Settings.cleanupEnabled() ? await cleanOldSessions() : 0;

    return Response.json({ status: "ok", reaped, purgedLogs, sessionCleanup, ...result }, { status: 200 });
  } catch (error) {
    await log({
      level: LogLevel.ERROR,
      action: LogAction.FILE_EXPIRED,
      message: "Expired files cron job failed",
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
