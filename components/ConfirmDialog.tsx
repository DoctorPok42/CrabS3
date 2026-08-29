"use client"
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef } from "react"
import Button from './Button';

export interface ConfirmDialogAction {
  label: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  onClick: () => void
}

export interface ConfirmDialogProps {
  title: string
  message: string
  actions: ConfirmDialogAction[]
  onClose: () => void
}

const ConfirmDialog = ({ title, message, actions, onClose }: ConfirmDialogProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/70 z-50">
      <div
        ref={ref}
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark p-6 rounded-2xl max-w-116"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 id="confirm-dialog-title" className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
          <Button onClick={onClose} icon={faCircleXmark} variant="ghost" divClass="text-xl! p-0!" title="Close" />
        </div>

        <p className="text-zinc-500 dark:text-zinc-400 mb-5 text-[14.5px] whitespace-break-spaces">{message}</p>

        <div className="flex gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              text={action.label}
              onClick={action.onClick}
              variant={action.variant || 'secondary'}
              divClass="w-full"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
