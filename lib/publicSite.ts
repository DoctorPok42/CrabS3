export const IS_CANONICAL_INSTANCE =
  process.env.NEXT_PUBLIC_CANONICAL_INSTANCE === "true";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://crabs3.doctorpok.io";

export const publicPageRobots = IS_CANONICAL_INSTANCE
  ? { index: true, follow: true }
  : { index: false, follow: false };
