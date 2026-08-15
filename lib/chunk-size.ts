export function getChunkSize(fileSize: number): number {
  if (fileSize < 10 * 1024 * 1024) return fileSize; // < 10 MB - no chunking
  if (fileSize < 100 * 1024 * 1024) return 15 * 1024 * 1024; // < 100 MB - 15 MB chunks
  if (fileSize < 500 * 1024 * 1024) return 50 * 1024 * 1024; // < 500 MB - 50 MB chunks
  if (fileSize < 1024 * 1024 * 1024) return 50 * 1024 * 1024; // < 1 GB - 50 MB chunks
  if (fileSize < 3 * 1024 * 1024 * 1024) return 75 * 1024 * 1024; // 1-3 GB - 75 MB chunks
  if (fileSize < 5 * 1024 * 1024 * 1024) return 100 * 1024 * 1024; // 3-5 GB - 100 MB chunks
  return 150 * 1024 * 1024; // > 5 GB - 150 MB chunks
}
