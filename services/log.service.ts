import prisma from "@/lib/prisma";
import { LogAction, LogLevel } from "@/types/log.types";

const LOG_LEVEL_ORDER = ["DEBUG", "INFO", "WARN", "ERROR"];
const MIN_LEVEL = (process.env.LOG_MIN_LEVEL || "INFO") as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER.indexOf(level) >= LOG_LEVEL_ORDER.indexOf(MIN_LEVEL);
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

  if (!shouldLog(level)) return;

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
