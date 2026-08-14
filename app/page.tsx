"use client"

import { Button, Input, PopupStatus } from '@/components'
import { useMultipartUpload } from '@/hooks/useMultipartUpload'
import { formatSize } from '@/lib/format'
import { faArrowsDownToLine, faAt, faClockRotateLeft, faFileCode, faFileImage, faFileText, faFolderOpen, faKey, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useState, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

export default function Home() {
  const [maxDownloads, setMaxDownloads] = useState<number | null>(null)
  const [emailRecipient, setEmailRecipient] = useState<string>("")
  const [emailMessage, setEmailMessage] = useState<string>("")
  const [expireAfter, setExpireAfter] = useState<"1" | "7" | "14" | "21" | "30">("30")
  const [password, setPassword] = useState<string>("")
  const [folderName, setFolderName] = useState<string>("")
  const [fileMeta, setFileMeta] = useState<{ name: string, size: number, img?: string }[]>([])
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [folderId, setFolderId] = useState<string>("")
  const [uploadResults, setUploadResults] = useState<number>(0)
  const [status, setStatus] = useState<{
    message: string
    type: "success" | "error" | "info"
    fileId?: string
  } | null>(null)
  const uploadResultsRef = useRef<number>(0)

  const { upload, progress, uploading, reset, error, prewarm, cancelPrewarm, cancelAllPrewarm } = useMultipartUpload();

  useEffect(() => {
    return () => {
      cancelAllPrewarm()
    }
  }, [cancelAllPrewarm])

  useEffect(() => {
    const handlePageHide = () => {
      cancelAllPrewarm()
    }

    window.addEventListener("pagehide", handlePageHide)
    return () => window.removeEventListener("pagehide", handlePageHide)
  }, [cancelAllPrewarm])

  useEffect(() => {
    if (!uploading && uploadResults > 0) {
      if (uploadResults === files.length && folderId) {
        setStatus({
          message: `Successfully uploaded ${uploadResults} file${uploadResults > 1 ? 's' : ''}!`,
          type: "success",
          fileId: folderId,
        })

        setFileMeta([])
        setFiles([])
        setFolderId("")
        setPassword("")
        setMaxDownloads(null)
        setEmailRecipient("")
        setEditingFileIndex(null)
        setUploadResults(0)
        reset()
        uploadResultsRef.current = 0
      } else if (uploadResults > 0 && uploadResults < files.length) {
        setStatus({
          message: `Successfully uploaded ${uploadResults} of ${files.length} files`,
          type: "success",
          fileId: folderId,
        })
        setUploadResults(0)
        uploadResultsRef.current = 0
      } else {
        setStatus({ message: "Failed to upload files.", type: "error" })
        setUploadResults(0)
        uploadResultsRef.current = 0
      }
    }
  }, [uploading, uploadResults])

  useEffect(() => {
    if (error) {
      setFolderId("")
      setUploadResults(0)
      uploadResultsRef.current = 0
      setStatus({ message: error || "An error occurred during upload.", type: "error", fileId: undefined })
    }
  }, [error])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (uploading) return;

    const currentFolderId = folderId || crypto.randomUUID();
    if (!folderId) {
      setFolderId(currentFolderId);
    }

    const newMeta = acceptedFiles.map(file => ({
      name: file.name,
      size: file.size,
      img: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
    }))

    setFileMeta(prev => [...prev, ...newMeta])
    setFiles(prev => [...prev, ...acceptedFiles])
    setStatus(null)

    for (const file of acceptedFiles) {
      prewarm(file, currentFolderId, file.name, folderName)
    }
  }, [uploading, folderId, prewarm])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const uploadFile = async () => {
    if (files.length === 0 || fileMeta.length === 0) return

    setStatus({ message: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`, type: "info" })
    setUploadResults(0)
    uploadResultsRef.current = 0

    scrollTo({ top: 0, behavior: "smooth" })

    try {
      const results = await Promise.all(files.map((file, index) =>
        upload(file, {
          maxDownloads: maxDownloads ?? null,
          emailRecipient: emailRecipient || undefined,
          expireAfter,
          password: password || undefined,
          filename: fileMeta[index].name,
          folderId,
          emailMessage: emailMessage ? emailMessage.replaceAll('\n', String.raw`\n`) : undefined,
          folderName,
        })
      ))

      const successfulUploads = results.filter((res): res is Exclude<typeof res, null> => res !== null);
      uploadResultsRef.current = successfulUploads.length
      setUploadResults(successfulUploads.length)
    } catch (error) {
      setStatus({ message: "An error occurred during upload.", type: "error" })
      setUploadResults(0)
      uploadResultsRef.current = 0
      console.error("Upload error:", error)
    }
  }

  const removeFile = (index: number) => {
    const fileToRemove = files[index]
    if (fileToRemove) {
      cancelPrewarm(fileToRemove)
    }

    setFileMeta(prev => prev.filter((_, i) => i !== index))
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (fileMeta.length === 1) {
      setStatus(null)
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CrabS3",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (self-hosted, Docker)",
    description: "Self-hosted file and secret sharing on any S3-compatible storage.",
    url: "https://crabs3.doctorpok.io",
    license: "https://opensource.org/licenses/MIT",
    codeRepository: "https://github.com/DoctorPok42/CrabS3",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: ["Resumable multipart uploads", "Download limits with auto-deletion", "Password-protected secret sharing", "Hot and cold storage", "Two-factor authentication"],
  };

  return (
    <main className={`flex flex-col ${fileMeta.length > 0 ? 'pt-10 pb-2' : 'my-auto justify-center'} w-full max-w-7xl items-center md:px-16 px-4`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {(status || uploading) && (
        <PopupStatus message={status?.message || "Uploading..."}
          type={status?.type || "info"}
          fileId={status?.type === "error" ? undefined : (status?.fileId || (uploading && folderId) || undefined)}
          uploading={uploading}
          fileMeta={fileMeta}
          progress={progress}
        />
      )}

      <div style={{ ['--shadow-color' as string]: '#3b82f6aa' }} className={`lg:w-150 w-full ${fileMeta.length > 0 ? 'h-40 md:h-40 p-1 rounded-2xl bg-input! dark:bg-input-dark!' : 'inputShadow h-[30vh] my-auto p-2 rounded-4xl mt-10'} ${(status || uploading) && "mt-5!"} flex items-center justify-center border-zinc-200 dark:border-zinc-700 border-2 cursor-pointer group hover:border-blue-500 bg-zinc-50 dark:bg-zinc-900 transition duration-250`}>
        <div className={`${fileMeta.length > 0 ? 'rounded-xl' : 'rounded-3xl'} w-full h-full flex items-center justify-center border-dashed border-zinc-200 dark:border-zinc-700 border-2 group-hover:border-blue-300 dark:group-hover:border-blue-800 transition duration-250`} {...getRootProps()}>
          <input {...getInputProps()} />
          <div className="p-8 text-xl text-center text-zinc-700 dark:text-zinc-300">
            {fileMeta.length > 0 ? <div>
              <div className='flex justify-center'>
                <FontAwesomeIcon icon={faFileText} size='3x' className='-rotate-45 -mr-9 mt-3 text-zinc-400 dark:text-zinc-700' />
                <FontAwesomeIcon icon={faFileImage} size='3x' className='z-1 text-zinc-600 dark:text-zinc-400' />
                <FontAwesomeIcon icon={faFileCode} size='3x' className='rotate-45 -ml-9 mt-3 text-zinc-400 dark:text-zinc-700' />
              </div>
              <div className='flex flex-col justify-center mt-4'>
                <p className='text-sm font-bold text-zinc-700 dark:text-zinc-300'>{fileMeta.length} file{fileMeta.length > 1 ? 's' : ''} selected</p>
              </div>
            </div> : <span className='w-3/5 flex m-auto'>Drag and drop some files here, or click to select files</span>}
          </div>
        </div>
      </div>

      {
        fileMeta.length > 0 && <div className="lg:w-150 w-full mt-5 flex flex-col border-cardBorder dark:border-cardBorder-dark border rounded-3xl p-6 bg-card dark:bg-card-dark transition duration-300">
          <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Options</h3>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-rows-auto">
            <Input
              label="Name of folder"
              id="folderName"
              type="text"
              name="folderName"
              placeholder='Holiday Photos, Project Files, etc.'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              icon={faFolderOpen}
              autoFocus
              divClass='col-span-1 md:col-span-2 lg:col-span-4'
            />

            <Input
              label="Max downloads"
              id="option1"
              type="number"
              name="option1"
              placeholder="e.g. 5"
              value={maxDownloads ?? ''}
              onChange={(e) => setMaxDownloads(e.target.value === '' ? null : Math.max(1, Number.parseInt(e.target.value)))}
              icon={faArrowsDownToLine}
            />

            <div className="flex flex-col gap-1 col-span-1 lg:col-span-2">
              <label htmlFor="option1" className="text-[#5b544f] dark:text-[#a59d97] text-[13px] tracking-[0.001em] font-semibold">Expire after (days)</label>
              <div className='group h-11.5 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl px-3 text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
                <FontAwesomeIcon icon={faClockRotateLeft} className='text-zinc-700 dark:text-[#d2d5da] w-3' size='xs' />
                <select
                  id="option1"
                  name="option1"
                  className="outline-none w-full bg-input dark:bg-input-dark text-zinc-700 group-hover:bg-[#f4f4f6] dark:group-hover:bg-[#25272c] dark:text-[#d2d5da] cursor-pointer transition duration-300"
                  value={expireAfter}
                  onChange={(e) => setExpireAfter(e.target.value as "1" | "7" | "14" | "21" | "30")}
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="21">21 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
            </div>

            <Input
              label="Email of recipient"
              id="emailRecipient"
              type="email"
              name="emailRecipient"
              placeholder='recipient@example.com'
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              icon={faAt}
            />

            <Input
              label="Password (optional)"
              id="password"
              type="password"
              name="password"
              placeholder='MySecretPassword'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={faKey}
            />

            {emailRecipient && <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-4 gap-1">
              <label htmlFor="emailMessage" className="text-[#5b544f] dark:text-[#a59d97] text-[13px] tracking-[0.001em] font-semibold">Message to recipient</label>
              <div className='inputClass w-full! items-start! text-lg bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed]! dark:border-[#383a42]! rounded-2xl px-3 py-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300'>
                <textarea
                  id="emailMessage"
                  name="emailMessage"
                  placeholder='Optional message to recipient'
                  className="outline-none bg-transparent resize-none h-20 w-full text-sm"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>
            </div>}

            <div className='col-span-1 md:col-span-2 lg:col-span-4 flex flex-wrap justify-between pt-5 mt-3 border-t border-cardBorder dark:border-cardBorder-dark'>
              <div className='flex flex-col w-full'>
                <h3 className="text-[15px] font-bold text-zinc-700 dark:text-zinc-300">Selected File{fileMeta.length > 1 ? 's' : ''} ({fileMeta.length})</h3>
                <div className='space-y-3 mt-3'>
                  {fileMeta.map((f, index) => (
                    <div key={index + f.name} className='flex gap-2 items-start bg-input dark:bg-input-dark dark:bg-input-darks p-3 rounded-2xl'>
                      <div className='w-full flex items-center gap-3'>
                        <div className='flex flex-1 min-w-0 gap-2 items-center'>
                          {f.img && (
                            <Link href={f.img} target="_blank" className='relative w-11 h-11 rounded-xl overflow-hidden'>
                              <Image src={f.img} alt={`Preview of ${f.name}`} className="rounded-xl" fill />
                            </Link>
                          )}

                          <div className='flex flex-col flex-1 min-w-0'>
                            <div>
                              {editingFileIndex === index ? (
                                <input
                                  type="text"
                                  autoFocus
                                  className="w-full text-[14.5px] outline-none font-semibold bg-white dark:bg-black border-2 border-focus-border rounded-md px-2 text-zinc-700 dark:text-zinc-300 transition duration-300"
                                  value={f.name.replace(/\.[^/.]+$/, "")}
                                  onChange={(e) => setFileMeta(prev => {
                                    const updated = [...prev]
                                    updated[index] = { ...updated[index], name: e.target.value + f.name.slice(f.name.lastIndexOf('.')) }
                                    return updated
                                  })}
                                  onBlur={() => setEditingFileIndex(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingFileIndex(null)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingFileIndex(index)}
                                  title={f.name}
                                  className="w-full text-[14.5px] text-text truncate dark:text-text-dark font-semibold cursor-pointer hover:text-blue-500 text-left transition duration-150"
                                >
                                  {f.name}
                                </button>
                              )}
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-[12.5px]">{formatSize(f.size)}</p>
                          </div>
                        </div>

                        <Button
                          text="Remove"
                          onClick={() => removeFile(index)}
                          variant='danger'
                          divClass='shrink-0'
                          responsiveIcon={faTrash}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              <div className='w-full mt-4 flex gap-2'>
                <Button
                  text="Clear"
                  onClick={() => {
                    cancelAllPrewarm()
                    setFileMeta([])
                    setFiles([])
                    setFolderId("")
                    setStatus(null)
                  }}
                  variant='secondary'
                  disabled={uploading || files.length === 0}
                />
                <Button
                  text={uploading ? "Uploading..." : `Upload File${fileMeta.length > 1 ? 's' : ''}`}
                  onClick={() => uploadFile()}
                  disabled={uploading || files.length === 0}
                  divClass='w-full'
                />
              </div>
            </div>
          </div>
        </div>
      }

      <div className='flex flex-col items-center gap-2 mt-4 -mb-4'>
        <h3 className="text-md italic text-zinc-500 dark:text-zinc-400">Or send a secret</h3>
        <Link href="/secrets" className='text-sm py-2 px-4 rounded-full font-bold bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark text-zinc-800 dark:text-zinc-200 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 transition duration-150'>
          Send a Secret
        </Link>
      </div>
    </main >
  );
}
