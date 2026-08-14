import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared File - CrabS3",
  description: "Share files securely with others using your own S3 bucket.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
