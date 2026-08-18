const HASH_CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB

export async function computeFileHash(file: File): Promise<string> {
  const totalChunks = Math.max(1, Math.ceil(file.size / HASH_CHUNK_SIZE));
  const chunkDigests: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * HASH_CHUNK_SIZE;
    const end = Math.min(start + HASH_CHUNK_SIZE, file.size);
    const buffer = await file.slice(start, end).arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    chunkDigests.push(new Uint8Array(digest));
  }

  const combined = new Uint8Array(chunkDigests.reduce((sum, d) => sum + d.length, 0));
  let offset = 0;
  for (const digest of chunkDigests) {
    combined.set(digest, offset);
    offset += digest.length;
  }

  const finalDigest = await crypto.subtle.digest("SHA-256", combined);
  return Array.from(new Uint8Array(finalDigest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
