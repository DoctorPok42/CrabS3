import prisma from "@/lib/prisma";
import { Settings } from "@/services/settings.service";
import { LogAction, LogLevel } from "@/types/log.types";

const LOG_LEVEL_ORDER = ["DEBUG", "INFO", "WARN", "ERROR"];

async function resolveMinLevel(): Promise<string> {
  try {
    return await Settings.logMinLevel();
  } catch {
    return process.env.LOG_MIN_LEVEL || "INFO";
  }
}

async function shouldLog(level: LogLevel): Promise<boolean> {
  const minLevel = await resolveMinLevel();
  return LOG_LEVEL_ORDER.indexOf(level) >= LOG_LEVEL_ORDER.indexOf(minLevel);
}

interface LogOptions {
  level?: LogLevel;
  action: LogAction;
  message: string;
  userId?: number;
  meta?: Record<string, unknown>;
}

export async function log(options: LogOptions): Promise<void> {
  const level = options.level ?? LogLevel.INFO;

  if (!(await shouldLog(level))) return;

  try {
    if (await Settings.logConsoleEnabled()) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`[${level}] ${options.action} - ${options.message}`, options.meta || "");
          break;
        case LogLevel.INFO:
          console.info(`[${level}] ${options.action} - ${options.message}`, options.meta || "");
          break;
        case LogLevel.WARN:
          console.warn(`[${level}] ${options.action} - ${options.message}`, options.meta || "");
          break;
        case LogLevel.ERROR:
          console.error(`[${level}] ${options.action} - ${options.message}`, options.meta || "");
          break;
      }
    }
  } catch { }

  try {
    await prisma.logs.create({
      data: {
        level,
        action: options.action,
        message: options.message,
        user_id: options.userId || null,
        meta: options.meta ? JSON.stringify(options.meta) : {},
      },
    });
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}

export async function purgeOldLogs(): Promise<number> {
  const retentionDays = await Settings.logRetentionDays();
  if (!retentionDays || retentionDays <= 0) return 0;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.logs.deleteMany({
    where: { created_at: { lt: cutoff } },
  });

  if (count > 0) {
    await log({
      level: LogLevel.INFO,
      action: LogAction.ADMIN_ACTION,
      message: `Purged ${count} logs older than ${retentionDays} days`,
      meta: { count, retentionDays, cutoff: cutoff.toISOString() },
    });
  }

  return count;
}
