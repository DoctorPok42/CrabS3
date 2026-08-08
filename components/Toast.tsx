"use client"

import { LogLevelsColors } from "./log-colors";
import { useEffect, useState } from "react";

type ToastLevel = "info" | "success" | "warning" | "error";

export interface ToastProps {
  level?: ToastLevel;
  message?: string;
  actionLabel?: string;
  duration?: number;
  date?: Date;
}

export const TOAST_LEVEL_COLORS: Record<ToastLevel, string> = {
  info: LogLevelsColors.INFO,
  success: "bg-[#d0e3d0] text-green-800 dark:bg-green-950 dark:text-green-200",
  warning: LogLevelsColors.WARN,
  error: LogLevelsColors.ERROR,
};

const bgColors: Record<ToastLevel, string> = {
  info: "bg-[#edf7fc] border-[#a6d6ef] dark:bg-[#24363e] dark:border-[#194f6a]",
  success: "bg-[#f1f8f2] border-[#b9dabc] dark:bg-[#2c382a] dark:border-[#305531]",
  warning: "bg-[#f9f5ed] border-[#e2cea6] dark:bg-[#3c3321] dark:border-[#5e4618]",
  error: "bg-[#fbf3f3] border-[#ecc3c1] dark:bg-[#402f2c] dark:border-[#6a3b37]",
};


const Toast = ({
  level = 'info',
  message = '',
  actionLabel = '',
  duration = 3000,
}: ToastProps) => {
  const [toastList, setToastList] = useState<ToastProps[]>([]);

  useEffect(() => {
    if (message) {
      if (toastList.length >= 3) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToastList((prev) => prev.slice(1));
      }

      setToastList((prev) => [...prev, { level, message, actionLabel, duration, date: new Date() }]);
    }
  }, [message, level, actionLabel, duration]);

  setTimeout(() => {
    setToastList((prev) => prev.filter((toast) => {
      if (!toast.date) return true;
      return Date.now() - toast.date.getTime() < (toast.duration || 3000);
    }));
  }, 1000);

  return (
    <div className="fixed top-5 right-5 z-50">
      <div className="flex flex-col gap-2.5 max-w-150">
        {Array.from(toastList.values()).map((toast, index) => (
          <div key={index + 0} className={`flex flex-col gap-2.5 max-w-150 py-4 px-4.5 rounded-[20px] border ${bgColors[toast.level || "info"]} animation-toast`}>
            <div className="flex gap-3">
              <div className={`py-1 px-2.5 text-[10.5px] uppercase tracking-[0.03em] shrink-0 font-extrabold rounded-full ${TOAST_LEVEL_COLORS[toast.level || "info"]}`}>
                {toast.level}
              </div>
              <span className="text-[14px] font-semibold">{toast.message}</span>
            </div>

            {toast.actionLabel && (
              <div className="max-w-140 self-start px-4 py-2 bg-white dark:bg-input-dark text-[#332c28] dark:text-[#d7d1ce] rounded-full font-bold text-[13px] whitespace-normal wrap-break-word">
                {toast.actionLabel}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Toast;
