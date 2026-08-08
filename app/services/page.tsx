"use client"

import { Button, Input } from "@/components"
import Toast, { ToastProps } from "@/components/Toast"
import { formatSize } from "@/lib/format"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"

type Service = {
  id: number
  uuid: string
  name: string
  status: string
  quota: number
  files: number
  secrets: number
  totalFilesSize: number
  created_at: string | Date
  token?: string
  image?: string
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([])
  const [serviceName, setServiceName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [invitationCode, setInvitationCode] = useState<string>("")
  const [serviceId, setServiceId] = useState<number | null>(null)
  const invitationCodeRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<ToastProps | null>(null)

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/services/list")
        const data = await response.json()
        setServices(data)
      } catch (error) {
        console.error("Error fetching services:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const handleCreateService = async () => {
    try {
      if (serviceName.trim() === "") return

      const response = await fetch("/api/services/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: serviceName }),
      })

      if (response.ok) {
        const newService = await response.json()
        setServices((prevServices) => [...prevServices, newService])
        setServiceName("")
        setToast({ message: `Service created successfully`, level: "success" })
      } else {
        setToast({ message: `Error creating service, try again later`, level: "error" })
      }
    } catch (error) {
      console.error("Error creating service:", error)
      setToast({ message: `Error creating service, try again later`, level: "error" })
    }
  }

  const handleDeleteService = async (id: number) => {
    try {
      const response = await fetch(`/api/services/delete/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setServices((prevServices) => prevServices.filter((s) => s.id !== id))
        setToast({ message: `Service deleted successfully`, level: "success" })
      } else {
        setToast({ message: `Error deleting service, try again later`, level: "error" })
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      setToast({ message: `Error deleting service, try again later`, level: "error" })
    }
  }

  const handleToggleServiceStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus.toLowerCase() === "active" ? "suspended" : "active"
      const response = await fetch("/api/services/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus.toUpperCase() }),
      })

      if (response.ok) {
        setServices((prevServices) =>
          prevServices.map((service) =>
            service.id === id ? { ...service, status: newStatus.toUpperCase() } : service
          )
        )

        setToast({ message: `Service status updated to ${newStatus}`, level: "success" })
      } else {
        setToast({ message: `Error updating service status, try again later`, level: "error" })
      }
    } catch (error) {
      console.error("Error updating service status:", error)
      setToast({ message: `Error updating service status, try again later`, level: "error" })
    }
  }

  const handleCreateInvitation = async (serviceId: number) => {
    try {
      const response = await fetch("/api/services/create/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceId }),
      })

      if (response.ok) {
        const data = await response.json()
        setInvitationCode(data.invitationCode)
      } else {
        setToast({ message: `Error creating invitation, try again later`, level: "error" })
      }
    } catch (error) {
      console.error("Error creating invitation:", error)
      setToast({ message: `Error creating invitation, try again later`, level: "error" })
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      if (serviceId === null) {
        setToast({ message: "Please select a service before uploading an image.", level: "warning" })
        return
      }

      const response = await fetch("/api/services/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: serviceId,
          img: await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(acceptedFiles[0])
          })
        }),
      })

      if (response.ok) {
        globalThis.location.reload()
        setToast({ message: `Service image updated successfully`, level: "success" })
      } else {
        setToast({ message: `Error updating service image, try again later`, level: "error" })
      }
    } catch (error) {
      console.error("Error updating service image:", error)
      setToast({ message: `Error updating service image, try again later`, level: "error" })
    }
  }, [serviceId])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  useEffect(() => {
    if (invitationCodeRef.current) {
      const handleClickOutside = (event: MouseEvent) => {
        if (invitationCodeRef.current && !invitationCodeRef.current.contains(event.target as Node)) {
          setInvitationCode("")
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [invitationCode])

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">Services</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your services and integrations with CrabS3.</p>
        <hr className="border-cardBorder dark:border-cardBorder-dark mt-4" />
      </div>

      <Toast {...toast} />

      {invitationCode && (
        <div className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center bg-black/50 dark:bg-black/50 z-50">
          <div ref={invitationCodeRef} className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Invitation Code</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">Share this invitation code with others to allow them to join your service.</p>
            <div className="flex items-center justify-center gap-2">
              {invitationCode.split("").map((char, index) => (
                <div key={index + char} className="px-4.5 py-2.5 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-300 dark:border-zinc-700 text-xl font-bold text-zinc-700 dark:text-zinc-300">
                  {char}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col gap-4">
        <div className="w-full flex flex-col bg-card dark:bg-card-dark gap-2 p-5.5 border border-cardBorder dark:border-cardBorder-dark rounded-2xl">
          <h2 className="text-[16px] font-bold text-text dark:text-text-dark">Create a New Service</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-[13.5px]">Each service has its own quota and access token.</p>
          <div className="w-full flex items-end gap-2 mt-2">
            <Input
              id="service-name"
              type="text"
              placeholder="My Service"
              label="Service Name"
              name="service-name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              divClass="w-full"
            />

            <Button
              text="Create Service"
              onClick={handleCreateService}
              divClass="shrink-0"
            />
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-4">
        {loading && (
          <p className="text-zinc-500 dark:text-zinc-400">Loading services...</p>
        )}
        {services.length === 0 && !loading ? (
          <p className="text-zinc-500 dark:text-zinc-400">No services found.</p>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {services.map((service) => (
              <div key={service.id} className="w-full flex flex-col p-5.5 bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-2xl">
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <p className={`w-2 h-2 rounded-full ${service.status.toLocaleLowerCase() === "active" ? "bg-[#4aa651]" : service.status.toLocaleLowerCase() === "inactive" ? "bg-yellow-300" : "bg-red-300"}`}></p>
                    <h2 className="text-[16px] font-bold text-text dark:text-text-dark">{service.name}</h2>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${service.status.toLocaleLowerCase() === "active" ? "bg-green-100 text-green-800" : service.status.toLocaleLowerCase() === "inactive" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                    {service.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {service.token && (
                    <div className="w-3/5 mt-2 flex py-2 px-3 bg-input dark:bg-input-dark rounded-2xl border border-inputBorder dark:border-inputBorder-dark" onClick={() => { navigator.clipboard.writeText(service.token || ""), setToast({ message: "Token copied to clipboard", level: "success" }) }}>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate cursor-pointer">Token: {service.token}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center pb-2">
                    {service.image && (
                      <div className="w-full">
                        <img src={service.image} className="w-20 h-20 rounded-md object-cover" />
                      </div>
                    )}
                    <div className="items-center py-2 px-3.5 text-[12.5px] font-medium bg-input dark:bg-input-dark rounded-[14px] mt-2">
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Usage: {formatSize(service.totalFilesSize || 0)}</p>
                    </div>

                    <div className="items-center py-2 px-3.5 text-[12.5px] font-medium bg-input dark:bg-input-dark rounded-[14px] mt-2">
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Files: {service.files}</p>
                    </div>

                    <div className="items-center py-2 px-3.5 text-[12.5px] font-medium bg-input dark:bg-input-dark rounded-[14px] mt-2">
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Secrets: {service.secrets}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center pb-2">
                    <Button
                      text="Create Invitation"
                      onClick={() => handleCreateInvitation(service.id)}
                      variant="secondary"
                    />

                    <div {...getRootProps()}>
                      <Button
                        text="Upload Image"
                        onClick={() => setServiceId(service.id)}
                        variant="secondary"
                      />
                      <input {...getInputProps()} />
                    </div>

                    <Button
                      text={service.status.toLocaleLowerCase() === "active" ? "Deactivate Service" : "Activate Service"}
                      onClick={() => handleToggleServiceStatus(service.id, service.status)}
                      variant="secondary"
                    />

                    <Button
                      text="Delete Service"
                      onClick={() => handleDeleteService(service.id)}
                      variant="danger"
                    />
                  </div>
                </div>

                <div className="flex gap-2 items-center justify-between border-t border-cardBorder dark:border-cardBorder-dark pt-2 mt-2">
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Created at: {new Date(service.created_at).toLocaleString()}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">ID: {service.id} | {service.uuid}</span>
                </div>
              </div>
            ))}
          </div>
        )
        }
      </div >
    </main >
  )
}

export default Services