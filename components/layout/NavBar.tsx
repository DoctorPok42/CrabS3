"use client"

import { faArrowRightFromBracket, faBroadcastTower, faCloudArrowUp, faDashboard, faFile, faLock, faRectangleList, faUserGear } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NavBar = () => {
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string, isAdmin: boolean } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const links = [
    { name: "Upload", href: "/", icon: faCloudArrowUp },
    { name: "Secrets", href: "/secret", icon: faLock },
    { name: "Dashboard", href: "/dashboard", icon: faRectangleList },
    { name: "Communication", href: "/communication", icon: faBroadcastTower },
    { name: "Account", href: "/me", icon: faUserGear },
    {},
    { name: "Logs", href: "/logs", icon: faFile, adminOnly: true },
    { name: "Admin", href: "/admin", icon: faDashboard, adminOnly: true },
    {
      name: "Logout", href: "", icon: faArrowRightFromBracket, color: "text-red-800", onClick: async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        window.location.href = "/auth/login"
      }
    },
  ]

  if (pathname.split("/")[2] === "login" || pathname.split("/")[2] === "signup") return null

  return (
    <nav className="fixed left-0 top-0 w-69 h-screen lg:block hidden overflow-y-auto bg-white dark:bg-[#16171a] border-gray-200 dark:border-zinc-700 z-50 p-8 border-r">
      <div className="flex items-center gap-4">
        <Image src="/favicon.ico" alt="CrabS3 Logo" width={35} height={35} />
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">CrabS3</h1>
      </div>

      <div className="w-full rounded-lg border mt-7 border-gray-300 dark:border-zinc-700 p-3 bg-gray-50 dark:bg-zinc-800">
        {loading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <p className="w-8 h-8 rounded-full bg-gray-300 dark:bg-zinc-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer"></p>
            <p className="w-24 h-4 rounded bg-gray-300 dark:bg-zinc-600"></p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user?.name || "Unknown User"}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col mt-6 gap-2 text-md">
      {links.map((link) => {
          if (link.adminOnly && !user?.isAdmin) return null
          if (!link.name) return <hr key="divider" className="my-3 mr-8 border-gray-200 dark:border-zinc-800" />
          return (
            <Link
              key={link.name}
              onClick={() => link.onClick?.()}
              href={link.href}
              className={`flex gap-4 items-center rounded-md px-3 group hover:text-[#9f6afe] transition ${link.href === pathname ? "text-[#9f6afe]! opacity-90!" : ""} ${link.color || "text-gray-700 dark:text-gray-300"}`}
            >
              <FontAwesomeIcon icon={link.icon} className={` ${link.href === pathname ? "text-[#9f6afe] opacity-90!" : link.color || "text-[#444850]"} group-hover:text-[#9f6afe] w-3`} />
              {link.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default NavBar;
