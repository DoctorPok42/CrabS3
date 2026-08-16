"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { name: "Overview", href: "/" },
  { name: "Docs", href: "/docs" },
  { name: "Self-hosting", href: "/self-hosting" },
]

const PublicHeader = ({ signedIn }: { signedIn: boolean }) => {
  const pathname = usePathname()

  return (
    <header className="w-full sticky top-0 z-50 border-b border-cardBorder dark:border-cardBorder-dark bg-page/88 dark:bg-page-dark/88 backdrop-blur-xl">
      <div className="w-280 mx-auto px-8 h-17 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/web-app-manifest-192x192.png" alt="" aria-hidden="true" width={32} height={32} className="rounded-[9px]" priority />
          <span className="text-[17px] font-extrabold tracking-tight">CrabS3</span>
        </Link>

        <nav aria-label="Public" className="flex items-center gap-1 flex-wrap">
          {links.map((l) => {
            const isActive = l.href === pathname
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive ? "page" : undefined}
                className={`px-3.5 py-2 rounded-full text-sm font-semibold transition ${isActive
                  ? "text-uploadColor bg-uploadBg dark:bg-uploadBg-dark"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-input dark:hover:bg-input-dark"}`}
              >
                {l.name}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <a
            href="https://github.com/DoctorPok42/CrabS3"
            className="hidden sm:inline font-mono text-[13.5px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-primary-500 transition"
          >
            GitHub ↗
          </a>
          <Link
            href={signedIn ? "/dashboard" : "/auth/login"}
            className="px-4.5 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold transition"
          >
            {signedIn ? "Open app" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default PublicHeader
