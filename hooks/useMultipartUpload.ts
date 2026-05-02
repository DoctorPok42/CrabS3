import { useState, useCallback } from "react";

function getChunkSize(fileSize: number): number {
  if (fileSize < 50 * 1024 * 1024) return 5 * 1024 * 1024; // < 50 Mo - 5 Mo
  if (fileSize < 200 * 1024 * 1024) return 10 * 1024 * 1024; // < 200 Mo - 10 Mo
  if (fileSize < 1024 * 1024 * 1024) return 50 * 1024 * 1024; // < 1 Go - 50 Mo
  return 100 * 1024 * 1024;                                    // > 1 Go - 100 Mo
}

interface UploadOptions {
  maxDownloads?: number | null;
  notifyEmail?: string;
  expireAfter?: "1" | "7" | "14" | "21" | "30";
  password?: string;
  filename?: string;
}

interface UploadResult {
  fileId: string;
  etag: string;
  filename: string;
}

export function useMultipartUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    let uploadId: string | null = null;
    let fileId: string | null = null;
    const filename = options.filename?.trim() || file.name;

    try {
      const startRes = await fetch("/api/upload/multipart/start", {
        method: "POST",
        headers: {
          "X-Filename": filename,
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!startRes.ok) throw new Error("Failed to start upload");
      ({ fileId, uploadId } = await startRes.json());

      const CHUNK_SIZE = getChunkSize(file.size);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const parts: { PartNumber: number; ETag: string }[] = [];

      const chunkProgress = new Array(totalChunks).fill(0);
      const updateProgress = (index: number, pct: number) => {
        chunkProgress[index] = pct;
        const overall = Math.round(
          chunkProgress.reduce((a, b) => a + b, 0) / totalChunks
        );
        setProgress(overall);
      };

      for (let i = 0; i < totalChunks; i++) {
        const partNumber = i + 1;
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const etag = await uploadChunk(
          chunk, fileId!, uploadId!, partNumber,
          (pct) => updateProgress(i, pct),
        );

        parts.push({ PartNumber: partNumber, ETag: etag });
      }

      const metadata = {
        filename,
        contentType: file.type || "application/octet-stream",
        size: file.size.toString(),
        ...(options.maxDownloads && { maxDownloads: options.maxDownloads.toString() }),
        ...(options.notifyEmail && { notifyEmail: options.notifyEmail }),
        ...(options.expireAfter && { expireAfter: options.expireAfter || "30" }),
        ...(options.password && { password: options.password }),
      };

      const completeRes = await fetch("/api/upload/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, uploadId, parts, metadata }),
      });

      if (!completeRes.ok) throw new Error("Failed to complete upload");

      setProgress(100);
      const result = await completeRes.json();
      setUploading(false);
      return result;

    } catch (err) {
      if (fileId && uploadId) {
        fetch("/api/upload/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, uploadId }),
        }).catch(console.error);
      }

      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setUploading(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
  }, []);

  return { upload, progress, uploading, error, reset };
}

function uploadChunk(
  chunk: Blob,
  fileId: string,
  uploadId: string,
  partNumber: number,
  onProgress: (pct: number) => void,
  retries = 3
): Promise<string> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number) => {
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
          console.warn(`Part ${partNumber} failed (${xhr.status}), retry… (${remaining} left)`);
          setTimeout(() => attempt(remaining - 1), 1500);
        } else {
          reject(new Error(`Part ${partNumber} failed after retries: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        if (remaining > 0) {
          console.warn(`Part ${partNumber} network error, retry… (${remaining} left)`);
          setTimeout(() => attempt(remaining - 1), 1500);
        } else {
          reject(new Error(`Part ${partNumber} network error after retries`));
        }
      });

      xhr.open("POST", "/api/upload/multipart/part");
      xhr.setRequestHeader("X-File-Id", fileId);
      xhr.setRequestHeader("X-Upload-Id", uploadId);
      xhr.setRequestHeader("X-Part-Number", String(partNumber));

      xhr.send(chunk);
    };

    attempt(retries);
  });
}
