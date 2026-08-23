"use client"

import { useCallback, useEffect, useState } from "react";
import Toast, { ToastProps } from "@/components/Toast";
import { CATEGORY_LABELS, formatBytesSetting, SettingCategory, SettingDefinition, SETTINGS_CATALOG, SettingType, SettingValue } from "@/types/settings.types";
import { faArrowRotateLeft, faBoxArchive, faEnvelope, faHdd, faListUl, faScrewdriverWrench, faShieldHalved, faUpload } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface AdminSetting extends SettingDefinition {
  value: SettingValue
  rawValue: string
  isDefault: boolean
  updatedAt: string | null
  updatedBy: string | null
}

const CATEGORY_ICONS = {
  [SettingCategory.LOGGING]: faListUl,
  [SettingCategory.STORAGE]: faHdd,
  [SettingCategory.UPLOAD]: faUpload,
  [SettingCategory.SECURITY]: faShieldHalved,
  [SettingCategory.EMAIL]: faEnvelope,
  [SettingCategory.MAINTENANCE]: faScrewdriverWrench,
}

const CATEGORY_ORDER = Object.values(SettingCategory)

const SIZE_MULTIPLIERS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
}

function parseSizeInput(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "") return null

  const match = /^(-?\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i.exec(trimmed)
  if (!match) return null

  const amount = Number.parseFloat(match[1])
  const unit = (match[2] || "B").toUpperCase()
  return Math.round(amount * SIZE_MULTIPLIERS[unit])
}

const inputWrapper =
  "group h-11.5 px-3 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass"

const SettingsPage = () => {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [draftSettings, setDraftSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const replaceAll = (next: AdminSetting[]) => {
    setSettings(next)
    setDraftSettings(Object.fromEntries(next.map((setting) => [setting.key, setting.rawValue])))
  }

  const applySetting = (updated?: AdminSetting) => {
    if (!updated) return
    setSettings((current) =>
      current.map((setting) => (setting.key === updated.key ? updated : setting))
    )
    setDraftSettings((current) => ({ ...current, [updated.key]: updated.rawValue }))
  }

  const getAllSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        if (response.status === 403) {
          setForbidden(true);
          return;
        }

        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      replaceAll(data.settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setToast({ level: "error", message: "Failed to fetch settings" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getAllSettings();
  }, [getAllSettings]);

  const save = async (setting: AdminSetting, value: SettingValue) => {
    setSavingKey(setting.key)
    setToast(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value }),
      })
      const data = await res.json()

      if (!res.ok) {
        setToast({ level: "error", message: data.error || "Could not save setting" })
        setDraftSettings((d) => ({ ...d, [setting.key]: setting.rawValue }))
        return
      }

      applySetting(data.setting)
      setToast({ level: "success", message: `${setting.label} saved` })
    } catch (error) {
      console.error("Failed to save setting:", error)
      setToast({ level: "error", message: "Could not save setting" })
    } finally {
      setSavingKey(null)
    }
  }

  const reset = async (setting: AdminSetting) => {
    setSavingKey(setting.key)
    setToast(null)
    try {
      const res = await fetch(`/api/admin/settings?key=${setting.key}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setToast({ level: "error", message: data.error || "Could not reset setting" })
        return
      }

      applySetting(data.setting)
      setToast({ level: "info", message: `${setting.label} reset to default` })
    } finally {
      setSavingKey(null)
    }
  }

  const commitText = (setting: AdminSetting) => {
    const draft = draftSettings[setting.key] ?? ""
    if (draft === setting.rawValue) return

    if (setting.type === SettingType.NUMBER) {
      const parsed = setting.isBytes ? parseSizeInput(draft) : Number(draft)
      if (parsed === null || !Number.isFinite(parsed)) {
        setToast({ level: "error", message: `${setting.label} must be a number` })
        setDraftSettings((d) => ({ ...d, [setting.key]: setting.rawValue }))
        return
      }
      save(setting, parsed)
      return
    }

    save(setting, draft)
  }

  const renderControl = (setting: AdminSetting) => {
    const disabled = savingKey === setting.key
    const draft = draftSettings[setting.key] ?? ""

    if (setting.type === SettingType.BOOLEAN) {
      const enabled = setting.value === true
      return (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={setting.label}
          disabled={disabled}
          onClick={() => save(setting, !enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition duration-300 cursor-pointer ${enabled
            ? "bg-primary-500 border-primary-500"
            : "bg-input dark:bg-input-dark border-inputBorder dark:border-inputBorder-dark"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute top-0.75 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${enabled ? "left-6" : "left-0.75"
              }`}
          />
        </button>
      )
    }

    if (setting.options) {
      return (
        <div className={inputWrapper}>
          <select
            value={String(setting.value)}
            disabled={disabled}
            onChange={(e) => save(setting, e.target.value)}
            className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
          >
            {setting.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )
    }

    if (setting.type === SettingType.JSON || setting.multiline) {
      return (
        <textarea
          value={draft}
          disabled={disabled}
          rows={setting.type === SettingType.JSON ? 3 : 2}
          spellCheck={false}
          onChange={(e) => setDraftSettings((d) => ({ ...d, [setting.key]: e.target.value }))}
          onBlur={() => commitText(setting)}
          className={`${inputWrapper} h-auto! py-2.5 w-full resize-y outline-none ${setting.type === SettingType.JSON ? "font-mono text-[13px]" : ""
            }`}
        />
      )
    }

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className={inputWrapper}>
          <input
            type="text"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraftSettings((d) => ({ ...d, [setting.key]: e.target.value }))}
            onBlur={() => commitText(setting)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") setDraftSettings((d) => ({ ...d, [setting.key]: setting.rawValue }))
            }}
            className="outline-none w-full"
          />
          {setting.unit && !setting.isBytes && (
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400 shrink-0">
              {setting.unit}
            </span>
          )}
        </div>
        {setting.isBytes && (
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
            {formatBytesSetting(Number(setting.value))} · accepts &quot;10 GB&quot;
          </span>
        )}
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="flex flex-col w-full max-w-8xl items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
        <div className="w-full mb-8 flex flex-col">
          <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-400">You do not have permission to view this page.</p>
          <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full max-w-8xl items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full mb-8 flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Instance configuration. Changes apply within a minute, no restart needed.</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <Toast {...toast} />

      <div className="flex flex-col gap-6 w-full">
        {loading ? (
          <div className="w-full flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const categorySettings = settings.filter((s) => s.category === category)
            if (categorySettings.length === 0) return null

            return (
              <section
                key={category}
                className="w-full flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-3xl p-5.5 bg-card dark:bg-card-dark transition duration-300"
              >
                <div className="flex items-center gap-3 mb-1">
                  <FontAwesomeIcon
                    icon={CATEGORY_ICONS[category]}
                    className="text-primary-500 w-4"
                  />
                  <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                    {CATEGORY_LABELS[category]}
                  </h2>
                </div>
                <p className="text-[13.5px] text-zinc-600 dark:text-zinc-400 mb-2">
                  {categorySettings.length} settings ·{" "}
                  {categorySettings.filter((setting) => !setting.isDefault).length} customized
                </p>

                <div className="flex flex-col">
                  {categorySettings.map((setting) => (
                    <div
                      key={setting.key}
                      className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-8 py-4 border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14.5px] font-semibold text-zinc-700 dark:text-zinc-200">
                            {setting.label}
                          </span>
                          {!setting.isDefault && (
                            <span className="px-2 py-0.5 text-[10.5px] uppercase tracking-[0.03em] font-extrabold rounded-full bg-[#c8e2f0] text-[#004688] dark:bg-[#083f59] dark:text-[#58cffe]">
                              Custom
                            </span>
                          )}
                        </div>

                        {setting.description && (
                          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 max-w-2xl">
                            {setting.description}
                          </p>
                        )}

                        {setting.warning && setting.value === true && (
                          <p className="text-[13px] text-[#6a3200] dark:text-[#f4b63c] max-w-2xl">
                            {setting.warning}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-0.5">
                          <code className="text-[11.5px] text-zinc-400 dark:text-zinc-500">
                            {setting.key}
                          </code>
                          {setting.updatedBy && setting.updatedAt && (
                            <span className="text-[11.5px] text-zinc-400 dark:text-zinc-500">
                              {setting.updatedBy} ·{" "}
                              {new Date(setting.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 w-full lg:w-80 shrink-0">
                        <div className="flex-1">{renderControl(setting)}</div>
                        {!setting.isDefault && (
                          <button
                            type="button"
                            title="Reset to default"
                            aria-label={`Reset ${setting.label} to default`}
                            onClick={() => reset(setting)}
                            className="h-11.5 w-10 shrink-0 flex items-center justify-center rounded-2xl text-zinc-500 dark:text-zinc-400 hover:text-primary-500 hover:bg-input dark:hover:bg-input-dark transition duration-300 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faArrowRotateLeft} className="w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      {!loading && (
        <div className="w-full flex flex-col mt-6 sm:flex-row sm:items-center gap-3 justify-between border-cardBorder dark:border-cardBorder-dark border rounded-3xl p-5.5 bg-card dark:bg-card-dark mb-10">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Write defaults to database</h2>
            <p className="text-[13.5px] text-zinc-600 dark:text-zinc-400">
              Settings already fall back to their defaults. This only makes the{" "}
              {SETTINGS_CATALOG.length} rows visible directly in Postgres.
            </p>
          </div>

          <Button
            text="Sync catalog"
            variant="secondary"
            icon={faBoxArchive}
            divClass="gap-2 shrink-0"
            onClick={async () => {
              const res = await fetch("/api/admin/settings", { method: "POST" })
              console.log(res)
              const data = await res.json()
              setToast({ level: "success", message: `${data.created} settings written` })
              getAllSettings()
            }}
          />
        </div>
      )}
    </div >
  )
}

export default SettingsPage;
