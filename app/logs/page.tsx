"use client";

import { Button, Input, Log } from "@/components";
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
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
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
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Logs</h1>
        <p className="text-zinc-500 dark:text-zinc-400">View and manage your application logs</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <div className="w-full">
        <div className="grid lg:grid-cols-8 items-end gap-4 mb-8 flex-wrap">
          <div className="flex flex-col gap-1 col-span-2">
            <label htmlFor="option1" className="text-zinc-700 dark:text-zinc-300">Level</label>
            <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
              <FontAwesomeIcon icon={faLevelUpAlt} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
              <select
                value={filters.level}
                onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
                className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
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
            <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
              <FontAwesomeIcon icon={
                faCodeBranch
              } className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
              <select
                value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                className="outline-none w-full max-h-10 overflow-hidden bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
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
            <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
              <FontAwesomeIcon icon={faLevelUpAlt} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
              <select
                value={minLevel}
                onChange={(e) => updateMinLevel(e.target.value as LogLevel)}
                className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
              >
                {Object.values(LogLevel).map((level: LogLevel) => (
                  <option key={level} value={level}>{`Min Level: ${level}`}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            text="Apply"
            onClick={() => fetchLogs()}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {logs.map((log) => (
            <Log key={log.id} action={log.action} level={log.level} message={log.message} meta={log.meta} createdAt={log.created_at} userId={log.user} />
          ))}

          {logs.length === 0 && !loading && (
            <div className="w-full p-4 bg-yellow-500/40 border border-yellow-500 text-black font-bold rounded-2xl text-center">
              No logs found for the selected filters.
            </div>
          )}
        </div>

        {Math.ceil(total / 50) > 1 && <div className="flex h-10 items-center justify-center gap-4 mt-4">
          <Button
            icon={faChevronLeft}
            onClick={() => setPage(p => p - 1)}
            divClass="h-full"
            disabled={page <= 1}
          />
          <span className="text-zinc-700 dark:text-zinc-300  flex items-center">
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <Button
            icon={faChevronRight}
            onClick={() => setPage(p => p + 1)}
            divClass="h-full"
            disabled={page >= Math.ceil(total / 50)}
          />
        </div>}
      </div>
    </div>
  );
}

export default LogsPage;
