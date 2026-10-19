export function getPublicBaseUrl(): string {
  return (process.env.BASE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}
