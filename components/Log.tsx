"use client";

import { LogAction, LogLevel } from "@/types/log.types";
import { JSONValue } from "next/dist/server/config-shared";
import { useState } from "react";

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

const LogLevelsColors: Record<LogLevel, string> = {
  DEBUG: "text-gray-800 dark:text-gray-300",
  INFO: "bg-[#c8e2f0] text-[#004688] dark:bg-[#083f59] dark:text-[#58cffe]",
  WARN: "bg-[#ebdec5] text-[#6a3200] dark:bg-[#4f3605] dark:text-[#f4b63c]",
  ERROR: "bg-[#f1d9d7] text-[#800613] dark:bg-[#5b2b27] dark:text-[#f9978e]",
};

const Log = ({ level, action, message, meta, userId, createdAt }: LogProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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
        <span className="text-xs text-zinc-500 dark:text-zinc-300">
          {new Date(createdAt).toLocaleString("en-US", {
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
