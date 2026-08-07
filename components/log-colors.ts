import { LogLevel } from "@/types/log.types";

export const LogLevelsColors: Record<LogLevel, string> = {
  DEBUG: "text-gray-800 dark:text-gray-300",
  INFO: "bg-[#c8e2f0] text-[#004688] dark:bg-[#083f59] dark:text-[#58cffe]",
  WARN: "bg-[#ebdec5] text-[#6a3200] dark:bg-[#4f3605] dark:text-[#f4b63c]",
  ERROR: "bg-[#f1d9d7] text-[#800613] dark:bg-[#5b2b27] dark:text-[#f9978e]",
};