"use client"

import { Button } from "@/components"

const Page = () => {
  return (
    <div className="absolute inset-0 z-100 bg-background flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-text dark:text-text-dark">404 - Page Not Found</h1>
      <p className="text-zinc-500 dark:text-zinc-400 tracking-wider">The page you are looking for does not exist.</p>

      <div className="flex gap-4">
        <Button
          text="Go Back"
          onClick={() => window.history.back()}
        />

        <Button
          text="Go Home"
          variant="secondary"
          onClick={() => window.location.href = "/"}
        />
      </div>
    </div>
  )
}

export default Page
