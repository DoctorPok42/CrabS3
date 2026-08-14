"use client"

import { Button } from "@/components"
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="absolute inset-0 z-100 bg-background flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-text dark:text-text-dark">Something went wrong</h1>
      <p className="text-zinc-500 dark:text-zinc-400 tracking-wider">The request could not be completed. Retrying usually works; if it does not, the instance logs will have the details.</p>

      <div className="flex gap-4">
        <Button
          text="Try Again"
          onClick={reset}
        />
      </div>
    </div>
  )
}

