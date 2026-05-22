"use client";

import { LogAction, LogLevel } from "@/types/log.types";
import { useState } from "react";

interface LogProps {
  level: LogLevel
  action: LogAction
  message: string
  meta?: { [key: string]: any }
  userId?: string
  createdAt: string
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  INFO: "bg-blue-100 border border-blue-500 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-300",
  WARN: "bg-yellow-100 border border-yellow-500 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-600 dark:text-yellow-300",
  ERROR: "bg-red-100 border border-red-500 text-red-800 dark:bg-red-950 dark:border-red-600 dark:text-red-300",
};

const Log = ({ level, action, message, meta, userId, createdAt }: LogProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className={`w-full rounded-xl shadow mb-4 ${LEVEL_COLORS[level]} cursor-pointer`}>
      <div className="flex h-full p-4 justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex gap-4 items-center">
          <h3 className="font-bold">{action}</h3>
          <p className="text-sm">{message}</p>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-300">
          {new Date(createdAt).toLocaleString()}
        </span>
      </div>

      {isExpanded && (
        <div className="bg-white dark:bg-zinc-800 p-4 m-4 mt-2 rounded-lg cursor-auto border border-zinc-300 dark:border-zinc-700">
          <pre className="text-sm text-zinc-700 dark:text-zinc-300 overflow-x-auto">
            {JSON.stringify({ userId, meta: JSON.parse(meta as unknown as string) ?? {} }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default Log;
