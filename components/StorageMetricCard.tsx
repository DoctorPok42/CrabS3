import { IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

interface StorageMetricCardProps {
  title: string
  value: string | number
  icon: IconDefinition
  color: "blue" | "green" | "red" | "purple" | "orange" | "gray"
  subtitle?: string
}

const colorMap = {
  blue: "bg-blue-50 dark:bg-slate-800/40 text-blue-600 dark:text-blue-300 border-blue-50 dark:border-slate-800/40",
  green: "bg-emerald-50 dark:bg-slate-800/40 text-emerald-600 dark:text-emerald-300 border-emerald-50 dark:border-slate-800/40",
  red: "bg-rose-50 dark:bg-slate-800/40 text-rose-600 dark:text-rose-300 border-rose-50 dark:border-slate-800/40",
  purple: "bg-violet-50 dark:bg-slate-800/40 text-violet-600 dark:text-violet-300 border-violet-50 dark:border-slate-800/40",
  orange: "bg-orange-50 dark:bg-slate-800/40 text-orange-700 dark:text-orange-300 border-orange-50 dark:border-slate-800/40",
  gray: "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-50 dark:border-slate-800/40",
}

export const StorageMetricCard = ({ title, value, icon, color, subtitle }: StorageMetricCardProps) => {
  return (
    <div className={`col-span-1 border rounded-xl p-4 transition-shadow ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold opacity-75 w-[90%]">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
        </div>
        <FontAwesomeIcon icon={icon} size="xl" opacity={0.7} />
      </div>
    </div>
  )
}
