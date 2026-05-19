"use client"

import { useEffect, useState } from "react"

const Footer = () => {
  const [isFooterVisible, setIsFooterVisible] = useState<boolean>(false)

  useEffect(() => {
    const pathName = window.location.pathname
    if (pathName === "/auth/login" || pathName === "/auth/signup") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFooterVisible(false)
      return
    }
    setIsFooterVisible(true)
  }, [])

  if (!isFooterVisible) return null

  return (
    <div className='mt-12 mb-4 text-center text-zinc-500 dark:text-zinc-400 z-0 bg-transparent'>
      <h1 className="text-xl font-bold">CrabS3</h1>
      <p className="text-sm">No cloud. No bill. Just S3 buckets full of crabs. 🦀</p>
    </div>
  )
}

export default Footer
