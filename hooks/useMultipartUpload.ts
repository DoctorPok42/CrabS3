import { useState, useCallback, useRef } from "react";

const MAX_PARALLEL_CHUNKS = 6; // Upload multiple chunks in parallel for better performance

function getChunkSize(fileSize: number): number {
  if (fileSize < 10 * 1024 * 1024) return fileSize; // < 10 MB - no chunking
  if (fileSize < 100 * 1024 * 1024) return 15 * 1024 * 1024; // < 100 MB - 15 MB chunks
  if (fileSize < 500 * 1024 * 1024) return 50 * 1024 * 1024; // < 500 MB - 50 MB chunks
  if (fileSize < 1024 * 1024 * 1024) return 50 * 1024 * 1024; // < 1 GB - 50 MB chunks
  if (fileSize < 3 * 1024 * 1024 * 1024) return 75 * 1024 * 1024; // 1-3 GB - 75 MB chunks
  if (fileSize < 5 * 1024 * 1024 * 1024) return 100 * 1024 * 1024; // 3-5 GB - 100 MB chunks
  return 150 * 1024 * 1024; // > 5 GB - 150 MB chunks
}

interface UploadOptions {
  maxDownloads?: number | null;
  emailRecipient?: string;
  expireAfter?: "1" | "7" | "14" | "21" | "30";
  password?: string;
  filename?: string;
  folderId?: string;
  emailMessage?: string;
}

interface UploadResult {
  fileId: string;
  etag: string;
  filename: string;
}

interface StartSessionResult {
  fileId: string;
  uploadId: string;
  token: string;
}

interface PrewarmEntry {
  promise: Promise<StartSessionResult>;
  filename: string;
  folderId: string;
}

// Call on drop
async function startSession(
  file: File,
  filename: string,
  folderId: string
): Promise<StartSessionResult> {
  const startRes = await fetch("/api/upload/multipart/start", {
    method: "POST",
    headers: {
      "X-Filename": filename,
      "X-Folder-Id": folderId,
      "X-File-Size": file.size.toString(),
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!startRes.ok) {
    const errorData = await startRes.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to start upload");
  }

  return startRes.json();
}

export function useMultipartUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeUploads = useRef(new Map<string, number>());
  const uploadCount = useRef(0);
  const prewarmedSessions = useRef(new Map<File, PrewarmEntry>());


  const prewarm = useCallback((file: File, folderId: string, filename?: string) => {
    const name = filename?.trim() || file.name;
    const existing = prewarmedSessions.current.get(file);

    if (existing && existing.filename === name && existing.folderId === folderId) {
      return;
    }

    // Old session resolve then abort it in the background
    if (existing) {
      existing.promise
        .then(({ fileId, uploadId }) =>
          fetch("/api/upload/multipart/abort", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, folderId: existing.folderId, uploadId }),
          })
        )
        .catch(() => { });
    }

    prewarmedSessions.current.set(file, {
      promise: startSession(file, name, folderId),
      filename: name,
      folderId,
    });
  }, []);

  // Discard a prewarmed session
  const cancelPrewarm = useCallback((file: File) => {
    const entry = prewarmedSessions.current.get(file);
    if (!entry) return;
    prewarmedSessions.current.delete(file);

    entry.promise
      .then(({ fileId, uploadId }) =>
        fetch("/api/upload/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, folderId: entry.folderId, uploadId }),
        })
      )
      .catch(() => { });
  }, []);

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
    const filename = options.filename?.trim() || file.name;
    const folderId = options.folderId || crypto.randomUUID();

    try {
      const prewarmed = prewarmedSessions.current.get(file);
      const canReusePrewarm = !!prewarmed
        && prewarmed.filename === filename
        && prewarmed.folderId === folderId;

      if (prewarmed) {
        prewarmedSessions.current.delete(file);

        if (!canReusePrewarm) {
          prewarmed.promise
            .then(({ fileId: staleId, uploadId: staleUploadId }) =>
              fetch("/api/upload/multipart/abort", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: staleId, folderId: prewarmed.folderId, uploadId: staleUploadId }),
              })
            )
            .catch(() => { });
        }
      }

      let token: string;
      ({ fileId, uploadId, token } = canReusePrewarm
        ? await prewarmed!.promise
        : await startSession(file, filename, folderId));

      uploads.set(fileId!, 0);

      const CHUNK_SIZE = getChunkSize(file.size);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const parts: { PartNumber: number; ETag: string }[] = [];

      const chunkProgress = new Array(totalChunks).fill(0);
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

      // Upload chunks in parallel batches for better performance
      for (let i = 0; i < totalChunks; i += MAX_PARALLEL_CHUNKS) {
        const batchPromises = [];

        for (let j = 0; j < MAX_PARALLEL_CHUNKS && i + j < totalChunks; j++) {
          const chunkIndex = i + j;
          const partNumber = chunkIndex + 1;
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

        // Wait for batch to complete before starting next batch
        const batchResults = await Promise.all(batchPromises);
        parts.push(...batchResults.sort((a, b) => a.partNumber - b.partNumber)
          .map(r => ({ PartNumber: r.partNumber, ETag: r.etag })));
      }

      const metadata = {
        filename,
        contentType: file.type || "application/octet-stream",
        size: file.size.toString(),
        folderId,
        ...(options.maxDownloads ? { maxDownloads: options.maxDownloads.toString() } : { maxDownloads: null }),
        ...(options.emailRecipient && { emailRecipient: options.emailRecipient }),
        ...(options.expireAfter && { expireAfter: options.expireAfter || "30" }),
        ...(options.password && { password: options.password }),
        ...(options.emailMessage && { emailMessage: options.emailMessage }),
      };

      const completeRes = await fetch("/api/upload/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, folderId, uploadId, parts, metadata }),
      });

      if (!completeRes.ok) throw new Error("Failed to complete upload");

      uploads.delete(fileId!);
      uploadCount.current--;

      if (uploadCount.current === 0) {
        const responseData = await fetch("/api/upload/multipart/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        });

        if (!responseData.ok) {
          const errorData = await responseData.json();
          setError(errorData.error || "Failed to finalize upload");
        }

        setProgress(100);
        setUploading(false);
      }

      const result = await completeRes.json();
      return result;

    } catch (err) {
      if (fileId && uploadId) {
        fetch("/api/upload/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, folderId, uploadId }),
        }).catch(console.error);
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
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
  }, []);

  return { upload, progress, uploading, error, reset, prewarm, cancelPrewarm };
}

function uploadChunk(
  chunk: Blob,
  token: string,
  partNumber: number,
  onProgress: (pct: number) => void,
  retries = 3
): Promise<string> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number, delay: number = 500) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

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
          setTimeout(() => attempt(remaining - 1, Math.min(delay * 2, 5000)), delay);
        } else {
          reject(new Error(`Part ${partNumber} failed after retries: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        if (remaining > 0) {
          console.warn(`Part ${partNumber} network error, retry in ${delay}ms… (${remaining} left)`);
          setTimeout(() => attempt(remaining - 1, Math.min(delay * 2, 5000)), delay);
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
