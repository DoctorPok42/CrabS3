"use client"

import { Input } from "@/components"
import { faFileAlt, faGauge, faIdBadge, faKey } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"

type Service = {
  id: number
  name: string
  status: string
  quota: number
  files: number
  secrets: number
  totalFilesSize: number
  created_at: string | Date
  token?: string
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([])
  const [serviceName, setServiceName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

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
      } else {
        const errorData = await response.json()
        alert(`Error creating service: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error creating service:", error)
      alert("An error occurred while creating the service. Please try again.")
    }
  }

  const handleDeleteService = async (id: number) => {
    try {
      const response = await fetch(`/api/services/delete/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setServices((prevServices) => prevServices.filter((s) => s.id !== id))
      } else {
        const errorData = await response.json()
        alert(`Error deleting service: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      alert("An error occurred while deleting the service. Please try again.")
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
      } else {
        const errorData = await response.json()
        alert(`Error updating service status: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error updating service status:", error)
      alert("An error occurred while updating the service status. Please try again.")
    }
  }

  return (
    <main className="flex flex-col w-full max-w-8xl gap-8 items-center px-4 sm:px-16 pt-10 mt-0 my-auto">
      <div className="w-full flex flex-col">
        <h1 className="text-3xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">Services</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your services and integrations with CrabS3.</p>
        <hr className="border-zinc-200 dark:border-zinc-700 mt-4" />
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="w-full flex flex-col gap-2 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">Create a New Service</h2>
          <p className="text-zinc-500 dark:text-zinc-400">You can create a <span className="text-[#9f6afe]">new service</span> to integrate with CrabS3. Each service will have its own quota.</p>
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

            <button
              disabled={serviceName.trim() === ""}
              className="w-45 h-10 bg-[#9f6afe] hover:bg-[#8a4df0] disabled:bg-[#c5b3ff] dark:disabled:bg-[#c5b3ff] cursor-pointer disabled:cursor-not-allowed text-white rounded-md transition duration-300"
              onClick={handleCreateService}
            >
              Create Service
            </button>
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
              <div key={service.id} className="w-full flex flex-col gap-2 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <p className={`w-2 h-2 rounded-full ${service.status.toLocaleLowerCase() === "active" ? "bg-green-300" : service.status.toLocaleLowerCase() === "inactive" ? "bg-yellow-300" : "bg-red-300"}`}></p>
                    <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">{service.name}</h2>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-sm font-medium ${service.status.toLocaleLowerCase() === "active" ? "bg-green-100 text-green-800" : service.status.toLocaleLowerCase() === "inactive" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                    {service.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {service.token && (
                    <div className="w-3/5 flex gap-2 items-center py-2 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700" onClick={() => { navigator.clipboard.writeText(service.token || ""), alert("Token copied to clipboard!") }}>
                      <FontAwesomeIcon icon={faKey} size="sm" className="text-[#9f6afe]" />
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate cursor-pointer">Token: {service.token}</p>
                    </div>
                  )}

                  <div className="flex gap-2 items-center border-b border-zinc-200 dark:border-zinc-700 pb-2">
                    <div className="w-fit flex gap-2 items-center py-2 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-md mt-2">
                      <FontAwesomeIcon icon={faGauge} size="sm" className="text-[#9f6afe]" />
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Usage: {service.totalFilesSize && (service.totalFilesSize / 1024 / 1024 / 1024).toFixed(2) || 0} GB</p>
                    </div>

                    <div className="w-fit flex gap-2 items-center py-2 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-md mt-2">
                      <FontAwesomeIcon icon={faFileAlt} size="sm" className="text-[#9f6afe]" />
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Files: {service.files}</p>
                    </div>

                    <div className="w-fit flex gap-2 items-center py-2 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-md mt-2">
                      <FontAwesomeIcon icon={faKey} size="sm" className="text-[#9f6afe]" />
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Secrets: {service.secrets}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <button
                      className="w-fit px-3 py-2 cursor-pointer bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 rounded-md text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-700 transition duration-300"
                      onClick={() => handleToggleServiceStatus(service.id, service.status)}
                    >
                      {service.status.toLocaleLowerCase() === "active" ? "Deactivate Service" : "Activate Service"}
                    </button>

                    <button
                      className="w-fit px-3 py-2 cursor-pointer bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 transition duration-300"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      Delete Service
                    </button>
                  </div>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Created at: {new Date(service.created_at).toLocaleString()}</p>
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