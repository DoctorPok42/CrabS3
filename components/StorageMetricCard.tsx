import { IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

interface StorageMetricCardProps {
  title: string
  value: string | number
  icon: IconDefinition
  subtitle?: string
}

export const StorageMetricCard = ({ title, value, icon, subtitle }: StorageMetricCardProps) => {
  return (
    <div className={`rounded-2xl p-4 transition-shadow bg-[#f1edf6] text-[#5c2da5] dark:bg-[#22192d] dark:text-[#b79aea]`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold opacity-90">
          <p className="text-[12px] font-semibold">{title}</p>
          <FontAwesomeIcon icon={icon} size="xl" />
        </div>
        <p className="text-2xl font-bold mt-2 text-[#2f0c66] dark:text-[#e5d9ff]">{value}</p>
        {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
