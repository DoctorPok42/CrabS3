"use client";

import { LogAction, LogLevel } from "@/types/log.types";
import { JSONValue } from "next/dist/server/config-shared";
import { useState } from "react";
import { LogLevelsColors } from "./log-colors";
import { formatDate } from "@/lib/format";

export interface LogProps {
  level: LogLevel
  action: LogAction
  message: string
  meta?: { [key: string]: JSONValue } | null
  userId?: string
  createdAt: string
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  INFO: "bg-[#e8f0f4] border border-[#a3d1e9] dark:bg-[#0c1c24] dark:border-[#083c57]",
  WARN: "bg-[#f4eee5] border border-[#dfc9a0] dark:bg-[#241907] dark:border-[#4d3305]",
  ERROR: "bg-[#f6eceb] border border-[#e9bebb] dark:bg-[#281512] dark:border-[#592825]",
};

export { LogLevelsColors };

const Log = ({ level, action, message, meta, userId, createdAt }: LogProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <div className={`w-full rounded-[18px] ${LEVEL_COLORS[level]} cursor-pointer`}>
      <div className="flex h-full p-4 justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex gap-4 items-center">
          <div className={`py-1 px-2.5 text-[11px] font-extrabold rounded-full ${LogLevelsColors[level]}`}>
            {level}
          </div>

          <div className="flex gap-4 items-center">
            <h3 className="font-semibold">{action}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">{message}</p>
          </div>
        </div>
        <div className="w-34 text-right" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <span className="text-xs text-zinc-500 dark:text-zinc-300 text-left">
            {isHovered ? formatDate(createdAt) : new Date(createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-white dark:bg-zinc-800 p-4 m-4 mt-2 rounded-lg cursor-auto border border-zinc-300 dark:border-zinc-700">
          <pre className="text-sm text-zinc-700 dark:text-zinc-300 overflow-x-auto font-jetbrains-mono">
            {JSON.stringify({ userId, meta: JSON.parse(meta as unknown as string) ?? {} }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default Log;
