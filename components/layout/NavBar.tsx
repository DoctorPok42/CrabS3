"use client"

import { faArrowRightFromBracket, faBarsStaggered, faCircleNodes, faGrip, faLock, faShield, faTowerCell, faUpload, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavBarProps {
  user?: { name: string, isAdmin: boolean, id: number } | null
}

const NavBar = ({ user }: NavBarProps) => {
  const pathname = usePathname()

  if (!user) return null

  const links = [
    { name: "Upload", href: "/", icon: faUpload },
    { name: "Secrets", href: "/secrets", icon: faLock },
    { name: "Dashboard", href: "/dashboard", icon: faGrip },
    { name: "Communication", href: "/communication", icon: faTowerCell },
    { name: "Account", href: "/me", icon: faUser },
    { adminOnly: true },
    { name: "Logs", href: "/logs", icon: faBarsStaggered, adminOnly: true },
    { name: "Services", href: "/services", icon: faCircleNodes, adminOnly: true },
    { name: "Admin", href: "/admin", icon: faShield, adminOnly: true },
  ]

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": String(user?.id) } })
    window.location.href = "/auth/login"
  }

  const ignoredPaths = ["auth", "file", "secret", "docs", "self-hosted"]

  if (ignoredPaths.includes(pathname.split("/")[1])) return null

  return (
    <nav className="w-69 lg:block relative hidden bg-sidebar dark:bg-sidebar-dark border-gray-200 dark:border-zinc-700 z-50 p-8 pt-0 border-r">
      <div className="sticky top-0 pt-8">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/icon0.svg" alt="CrabS3 Logo" width={35} height={35} />
          <span className="text-xl font-bold text-gray-800 dark:text-gray-200">CrabS3</span>
        </Link>

        <div className="w-full rounded-2xl border mt-7 border-border dark:border-zinc-700 p-3 bg-input dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.name.split(' ').map(n => n[0]).join('')}
              </p>
              <p className="text-sm font-semibold text-text dark:text-text-dark truncate">{user?.name || "Unknown User"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col mt-6 -space-y-1 text-md">
          {links.map((link) => {
            if (link.adminOnly && !user?.isAdmin) return null
            if (!link.name) return <hr key="divider" className="my-3 mr-8 border-gray-200 dark:border-zinc-800" />
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex font-semibold gap-4 items-center px-3.5 py-2.5 rounded-full group hover:text-uploadColor hover:bg-uploadBg dark:hover:bg-uploadBg-dark transition ${link.href === pathname ? "text-uploadColor! opacity-90! bg-uploadBg dark:bg-uploadBg-dark" : ""} text-gray-700 dark:text-gray-300`}
              >
                <FontAwesomeIcon icon={link.icon} className={` ${link.href === pathname ? "text-uploadColor opacity-90!" : "text-[#444850]"} group-hover:text-uploadColor w-3`} />
                {link.name}
              </Link>
            )
          })}

          <div className="fixed bottom-5 w-60">
            <hr key="divider" className="my-3 mr-8 border-gray-200 dark:border-zinc-800" />
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer flex gap-4 items-center rounded-md px-3 transition hover:underline text-[#d84040]"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-[#d84040] w-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavBar;
