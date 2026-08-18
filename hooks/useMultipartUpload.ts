import { useState, useCallback, useRef } from "react";
import { computeFileHash } from "@/lib/file-hash";

const MAX_PARALLEL_CHUNKS = 6;
const PART_RETRIES = 6;
const STORAGE_PREFIX = "crabs3:mpu:";
const STORAGE_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

interface UploadOptions {
  maxDownloads?: number | null;
  emailRecipient?: string;
  expireAfter?: "1" | "7" | "14" | "21" | "30";
  password?: string;
  filename?: string;
  folderId?: string;
  emailMessage?: string;
  folderName?: string;
}

interface UploadResult {
  fileId: string;
  etag: string;
  filename: string;
}

interface ResumablePart {
  PartNumber: number;
  ETag: string;
  Size: number;
}

interface SessionResult {
  fileId: string;
  uploadId: string;
  token: string;
  chunkSize: number;
  uploadedParts: ResumablePart[];
  signature: string;
  folderId: string;
  resumed: boolean;
}

interface PrewarmEntry {
  promise: Promise<SessionResult>;
  filename: string;
  folderId: string;
  folderName?: string;
  signature: string;
}

interface PersistedSession {
  fileId: string;
  folderId: string;
  uploadId: string;
  filename: string;
  chunkSize: number;
  savedAt: number;
}

class UploadFlowError extends Error {
  fatal: boolean;
  constructor(message: string, fatal: boolean) {
    super(message);
    this.name = "UploadFlowError";
    this.fatal = fatal;
  }
}

function isFatalStatus(status: number) {
  return status >= 400 && status < 500;
}

function getFileSignature(file: File, filename: string): string {
  return `${filename}::${file.size}::${file.lastModified}`;
}

function hasStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function loadPersistedSession(signature: string): PersistedSession | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + signature);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (Date.now() - parsed.savedAt > STORAGE_MAX_AGE) {
      localStorage.removeItem(STORAGE_PREFIX + signature);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedSession(signature: string, data: Omit<PersistedSession, "savedAt">) {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + signature, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { }
}

function clearPersistedSession(signature: string) {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + signature);
  } catch { }
}

export function peekPersistedFolderId(file: File, filename?: string): string | undefined {
  const saved = loadPersistedSession(getFileSignature(file, filename?.trim() || file.name));
  return saved?.folderId;
}

function waitForOnline(): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener("online", handler);
      resolve();
    };
    window.addEventListener("online", handler);
  });
}

async function startSession(
  file: File,
  filename: string,
  folderId: string,
  contentHash: string
): Promise<{ fileId: string; uploadId: string; token: string; chunkSize: number }> {
  const startRes = await fetch("/api/upload/multipart/start", {
    method: "POST",
    headers: {
      "X-Filename": encodeURIComponent(filename),
      "X-Folder-Id": folderId,
      "X-File-Size": file.size.toString(),
      "X-Content-Hash": contentHash,
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!startRes.ok) {
    const errorData = await startRes.json().catch(() => ({}));
    throw new UploadFlowError(errorData.error || "Failed to start upload", isFatalStatus(startRes.status));
  }

  return startRes.json();
}

async function fetchResume(fileId: string): Promise<{
  fileId: string;
  folderId: string;
  uploadId: string;
  token: string;
  chunkSize: number;
  uploadedParts: ResumablePart[];
} | null> {
  const res = await fetch("/api/upload/multipart/resume", {
    method: "POST",
    headers: { "X-File-Id": fileId },
  });

  if (res.status === 404 || res.status === 409 || res.status === 410) {
    return null;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new UploadFlowError(errorData.error || "Failed to resume upload", isFatalStatus(res.status));
  }

  return res.json();
}

async function resolveSession(file: File, filename: string, folderId: string, contentHash: string = ""): Promise<SessionResult> {
  const signature = getFileSignature(file, filename);
  const saved = loadPersistedSession(signature);

  if (saved) {
    try {
      const resumed = await fetchResume(saved.fileId);
      if (resumed) {
        savePersistedSession(signature, {
          fileId: resumed.fileId,
          folderId: resumed.folderId,
          uploadId: resumed.uploadId,
          filename,
          chunkSize: resumed.chunkSize,
        });
        return {
          fileId: resumed.fileId,
          uploadId: resumed.uploadId,
          token: resumed.token,
          chunkSize: resumed.chunkSize,
          uploadedParts: resumed.uploadedParts,
          signature,
          folderId: resumed.folderId,
          resumed: true,
        };
      }
      clearPersistedSession(signature);
    } catch (err) {
      if (err instanceof UploadFlowError && err.fatal) throw err;
    }
  }

  const fresh = await startSession(file, filename, folderId, contentHash);
  savePersistedSession(signature, {
    fileId: fresh.fileId,
    folderId,
    uploadId: fresh.uploadId,
    filename,
    chunkSize: fresh.chunkSize,
  });

  return {
    fileId: fresh.fileId,
    uploadId: fresh.uploadId,
    token: fresh.token,
    chunkSize: fresh.chunkSize,
    uploadedParts: [],
    signature,
    folderId,
    resumed: false,
  };
}

interface DedupeMetadata {
  filename: string;
  contentType: string;
  size: string;
  maxDownloads?: string | null;
  emailRecipient?: string;
  expireAfter: UploadOptions["expireAfter"];
  password?: string;
  emailMessage?: string;
}

interface DedupeResult {
  duplicate: boolean;
  fileId?: string;
  folderId?: string;
  filename?: string;
  folderName?: string | null;
  etag?: string;
}

async function checkDedupe(
  hash: string,
  folderId: string,
  folderName: string | undefined,
  metadata: DedupeMetadata
): Promise<DedupeResult> {
  const res = await fetch("/api/upload/dedupe-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash, folderId, folderName: folderName || null, metadata }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new UploadFlowError(errorData.error || "Failed to check for a duplicate", isFatalStatus(res.status));
  }

  return res.json();
}

function attachHash(fileId: string, contentHash: string) {
  return fetch("/api/upload/multipart/set-hash", {
    method: "POST",
    headers: { "X-File-Id": fileId, "X-Content-Hash": contentHash },
  }).catch(() => { });
}

export function useMultipartUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeUploads = useRef(new Map<string, number>());
  const uploadCount = useRef(0);
  const prewarmedSessions = useRef(new Map<File, PrewarmEntry>());

  const abortPrewarmedSession = useCallback((entry: PrewarmEntry, dropSession: boolean) => {
    entry.promise
      .then(async ({ fileId, uploadId, folderId }) => {
        if (dropSession) clearPersistedSession(entry.signature);
        return fetch("/api/upload/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ fileId, folderId, uploadId }),
        });
      })
      .catch(() => { });
  }, []);

  const prewarm = useCallback((file: File, folderId: string, filename?: string, folderName?: string) => {
    const name = filename?.trim() || file.name;
    const existing = prewarmedSessions.current.get(file);

    if (existing?.filename === name && existing?.folderId === folderId) {
      return;
    }

    if (existing) {
      abortPrewarmedSession(existing, true);
    }

    prewarmedSessions.current.set(file, {
      promise: resolveSession(file, name, folderId).catch((error) => {
        prewarmedSessions.current.delete(file);
        throw error;
      }),
      filename: name,
      folderId,
      signature: getFileSignature(file, name),
    });
  }, [abortPrewarmedSession]);

  const cancelPrewarm = useCallback((file: File) => {
    const entry = prewarmedSessions.current.get(file);
    if (!entry) return;
    prewarmedSessions.current.delete(file);

    abortPrewarmedSession(entry, true);
  }, [abortPrewarmedSession]);

  const cancelAllPrewarm = useCallback(() => {
    const entries = Array.from(prewarmedSessions.current.values());
    prewarmedSessions.current.clear();

    for (const entry of entries) {
      abortPrewarmedSession(entry, true);
    }
  }, [abortPrewarmedSession]);

  const upload = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult | null> => {
    const uploads = activeUploads.current;

    uploadCount.current++;

    if (uploadCount.current === 1) {
      setUploading(true);
      setProgress(0);
      setError(null);
    }

    let uploadId: string | null = null;
    let fileId: string | null = null;
    let signature: string | null = null;
    const filename = options.filename?.trim() || file.name;
    let folderId = options.folderId || crypto.randomUUID();

    const finishBatchIfDone = async () => {
      uploadCount.current--;

      if (uploadCount.current === 0) {
        const responseData = await fetch("/api/upload/multipart/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId, folderName: options.folderName || null }),
        }).catch(() => null);

        if (!responseData?.ok) {
          const errorData = await responseData?.json().catch(() => ({})) ?? {};
          setError(errorData.error || "Failed to finalize upload");
        }

        setProgress(100);
        setUploading(false);
      }
    };

    try {
      const metadata = {
        filename,
        contentType: file.type || "application/octet-stream",
        size: file.size.toString(),
        ...(options.maxDownloads ? { maxDownloads: options.maxDownloads.toString() } : { maxDownloads: null }),
        ...(options.emailRecipient && { emailRecipient: options.emailRecipient }),
        ...(options.expireAfter && { expireAfter: options.expireAfter || "30" }),
        ...(options.password && { password: options.password }),
        ...(options.emailMessage && { emailMessage: options.emailMessage }),
      };

      const contentHash = await computeFileHash(file);
      const dedupe = await checkDedupe(contentHash, folderId, options.folderName, metadata as DedupeMetadata);

      if (dedupe.duplicate && dedupe.fileId) {
        const prewarmedForDedupe = prewarmedSessions.current.get(file);
        if (prewarmedForDedupe) {
          prewarmedSessions.current.delete(file);
          abortPrewarmedSession(prewarmedForDedupe, true);
        }
        clearPersistedSession(getFileSignature(file, filename));

        folderId = dedupe.folderId || folderId;
        await finishBatchIfDone();

        return {
          fileId: dedupe.fileId,
          etag: dedupe.etag || "deduplicated",
          filename: dedupe.filename || filename,
        };
      }

      const prewarmed = prewarmedSessions.current.get(file);
      const canReusePrewarm = !!prewarmed
        && prewarmed.filename === filename
        && prewarmed.folderId === folderId;

      if (prewarmed) {
        prewarmedSessions.current.delete(file);

        if (!canReusePrewarm) {
          abortPrewarmedSession(prewarmed, true);
        }
      }

      const session = canReusePrewarm
        ? await prewarmed!.promise
        : await resolveSession(file, filename, folderId, contentHash);

      ({ fileId, uploadId, signature } = session);
      folderId = session.folderId;
      const token = session.token;

      await attachHash(fileId, contentHash);

      uploads.set(fileId!, 0);

      const CHUNK_SIZE = session.chunkSize;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const parts: { PartNumber: number; ETag: string }[] = [];

      const chunkProgress = new Array(totalChunks).fill(0);
      const alreadyUploaded = new Map(session.uploadedParts.map((p) => [p.PartNumber, p.ETag]));

      for (const [partNumber, etag] of alreadyUploaded) {
        parts.push({ PartNumber: partNumber, ETag: etag });
        if (partNumber - 1 < totalChunks) chunkProgress[partNumber - 1] = 100;
      }

      const updateProgress = (index: number, pct: number) => {
        chunkProgress[index] = pct;
        const fileProgress = Math.round(
          chunkProgress.reduce((a, b) => a + b, 0) / totalChunks
        );
        uploads.set(fileId!, fileProgress);

        const overallProgress = Math.round(
          Array.from(uploads.values()).reduce((a, b) => a + b, 0) / uploads.size
        );
        setProgress(overallProgress);
      };

      for (let i = 0; i < totalChunks; i += MAX_PARALLEL_CHUNKS) {
        const batchPromises = [];

        for (let j = 0; j < MAX_PARALLEL_CHUNKS && i + j < totalChunks; j++) {
          const chunkIndex = i + j;
          const partNumber = chunkIndex + 1;

          if (alreadyUploaded.has(partNumber)) {
            continue;
          }

          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          batchPromises.push(
            uploadChunk(
              chunk,
              token,
              partNumber,
              (pct) => updateProgress(chunkIndex, pct)
            ).then(etag => ({ partNumber, etag }))
          );
        }

        const batchResults = await Promise.all(batchPromises);
        parts.push(...batchResults.map(r => ({ PartNumber: r.partNumber, ETag: r.etag })));
      }

      const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

      const completeRes = await fetch("/api/upload/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, folderId, uploadId, parts: sortedParts, metadata, folderName: options.folderName || null }),
      });

      if (!completeRes.ok) {
        const errorData = await completeRes.json().catch(() => ({}));
        throw new UploadFlowError(errorData.error || "Failed to complete upload", isFatalStatus(completeRes.status));
      }

      clearPersistedSession(signature);
      uploads.delete(fileId!);

      await finishBatchIfDone();

      const result = await completeRes.json();
      return result;

    } catch (err) {
      const fatal = err instanceof UploadFlowError ? err.fatal : false;

      if (fatal && fileId && uploadId) {
        await fetch("/api/upload/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ fileId, folderId, uploadId }),
        }).catch(console.error);

        if (signature) clearPersistedSession(signature);
      }

      if (fileId) {
        uploads.delete(fileId);
      }

      uploadCount.current--;

      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);

      if (uploadCount.current === 0) {
        setUploading(false);
      }

      return null;
    }
  }, [abortPrewarmedSession]);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
  }, []);

  return { upload, progress, uploading, error, reset, prewarm, cancelPrewarm, cancelAllPrewarm };
}

function uploadChunk(
  chunk: Blob,
  token: string,
  partNumber: number,
  onProgress: (pct: number) => void,
  retries = PART_RETRIES
): Promise<string> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number, delay: number = 500) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const retry = () => {
        waitForOnline().then(() => {
          setTimeout(() => attempt(remaining - 1, Math.min(delay * 2, 5000)), delay);
        });
      };

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const { etag } = JSON.parse(xhr.responseText);
            resolve(etag);
          } catch {
            reject(new Error(`Part ${partNumber}: invalid response`));
          }
        } else if (remaining > 0) {
          console.warn(`Part ${partNumber} failed (${xhr.status}), retry in ${delay}ms… (${remaining} left)`);
          retry();
        } else {
          reject(new Error(`Part ${partNumber} failed after retries: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        if (remaining > 0) {
          console.warn(`Part ${partNumber} network error, retry in ${delay}ms… (${remaining} left)`);
          retry();
        } else {
          reject(new Error(`Part ${partNumber} network error after retries`));
        }
      });

      xhr.addEventListener("abort", () => {
        reject(new Error(`Part ${partNumber} aborted`));
      });

      xhr.open("POST", "/api/upload/multipart/part");
      xhr.setRequestHeader("X-Upload-Token", token);
      xhr.setRequestHeader("X-Part-Number", String(partNumber));

      xhr.send(chunk);
    };

    attempt(retries);
  });
}
