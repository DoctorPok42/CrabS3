export function getPublicBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  return (configuredUrl?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}
