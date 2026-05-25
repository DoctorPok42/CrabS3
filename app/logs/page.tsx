"use client";

import { Input, Log } from "@/components";
import { LogAction, LogLevel } from "@/types/log.types";
import { faCalendar, faChevronLeft, faChevronRight, faCodeBranch, faLevelUpAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useState } from "react";

const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ level: "", action: "", from: "", to: "" });
  const [minLevel, setMinLevel] = useState<LogLevel>(LogLevel.INFO);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      ...(filters.level && { level: filters.level }),
      ...(filters.action && { action: filters.action }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    });
    const res = await fetch(`/api/admin/logs?${params}`);
    const data = await res.json();
    setLogs(data.logs);
    setTotal(data.total);
  }, [page, filters]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const updateMinLevel = async (level: LogLevel) => {
    await fetch("/api/admin/logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minLevel: level }),
    });
    setMinLevel(level);
  };

  return (
    <div className="flex flex-col w-full max-w-8xl items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full mb-8 flex flex-col">
        <h1 className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">Logs</h1>
        <p className="text-zinc-500 dark:text-zinc-400">View and manage your application logs</p>
        <hr className="border-zinc-200 dark:border-zinc-700 mt-4" />
      </div>

      <div className="w-full">
        <div className="grid lg:grid-cols-8 items-center gap-4 mb-8 flex-wrap">

          <div className="flex flex-col gap-1 col-span-2">
            <label htmlFor="option1" className="text-zinc-700 dark:text-zinc-300">Level</label>
            <div className='inputClass group h-10 text-lg bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300'>
              <FontAwesomeIcon icon={faLevelUpAlt} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
              <select
                value={filters.level}
                onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
                className="outline-none w-full bg-[#fafafa] dark:bg-[#1c1d21] text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
              >
                <option value="">All Levels</option>
                {Object.values(LogLevel).map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label htmlFor="option1" className="text-zinc-700 dark:text-zinc-300">Action</label>
            <div className='inputClass group h-10 text-lg bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300'>
              <FontAwesomeIcon icon={
                faCodeBranch
              } className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
              <select
                value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                className="outline-none w-full bg-[#fafafa] dark:bg-[#1c1d21] text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
              >
                <option value="">All Actions</option>
                {Object.values(LogAction).map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            placeholder="From date"
            id="from-date"
            label="From"
            name="from-date"
            icon={faCalendar}
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            placeholder="To date"
            id="to-date"
            label="To"
            name="to-date"
            icon={faCalendar}
          />

          <hr className="border-t border-zinc-300 dark:border-zinc-600 mt-4 hidden lg:block col-span-8" />

          <div className="flex flex-col gap-1 col-span-1 lg:col-span-2">
            <label htmlFor="option1" className="text-zinc-700 dark:text-zinc-300">Min Level</label>
            <div className='inputClass group h-10 text-lg bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300'>
              <FontAwesomeIcon icon={faLevelUpAlt} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
              <select
                value={minLevel}
                onChange={(e) => updateMinLevel(e.target.value as LogLevel)}
                className="outline-none w-full bg-[#fafafa] dark:bg-[#1c1d21] text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
              >
                {Object.values(LogLevel).map((level: LogLevel) => (
                  <option key={level} value={level}>{`Min Level: ${level}`}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setPage(1)}
            className="col-span-1 md:col-span-1 lg:col-span-2 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition duration-300 mt-7 cursor-pointer"
          >
            Apply
          </button>
        </div>

        <div>
          {logs.map((log) => (
            <Log key={log.id} action={log.action} level={log.level} message={log.message} meta={log.meta} createdAt={log.created_at} userId={log.user} />
          ))}

          {logs.length === 0 && (
            <div className="w-full p-4 bg-yellow-500 opacity-80 border border-yellow-500 text-black font-bold rounded-md text-center">
              No logs found for the selected filters.
            </div>
          )}
        </div>

        <div className="flex h-10 items-center justify-center gap-4 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-300 mt-7 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
          </button>
          <span className="text-zinc-700 dark:text-zinc-300  flex items-center mt-6">
            Page {page} / {Math.ceil(total / 50)} — {total} entrées
          </span>
          <button
            disabled={page >= Math.ceil(total / 50)}
            onClick={() => setPage(p => p + 1)}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-300 mt-7 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogsPage;
