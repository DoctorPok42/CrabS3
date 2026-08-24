import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Footer, NavBar } from "@/components";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Settings } from "@/services/settings.service";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crabs3.doctorpok.io";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "CrabS3 — Self-hosted S3 file & secret sharing",
    template: "%s — CrabS3",
  },
  description: "Send large files and encrypted secrets from your own S3 bucket. Resumable multipart uploads, download limits, auto-deletion, 2FA — open source and self-hosted.",
  applicationName: "CrabS3",
  keywords: ["self-hosted file sharing", "S3 file transfer", "secret sharing", "multipart upload", "RustFS", "open source WeTransfer alternative"],
  authors: [{ name: "DoctorPok42", url: "https://github.com/DoctorPok42" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CrabS3",
    url: "/",
    locale: "en_US",
    title: "CrabS3 — Self-hosted S3 file & secret sharing",
    description: "No cloud. No bill. Just S3 buckets full of crabs. 🦀",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CrabS3" }],
  },
  twitter: { card: "summary_large_image", creator: "@DoctorPok42" },
  robots: { index: true, follow: true },
  appleWebApp: { title: "CrabS3", capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0a08" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const dbUser = session
    ? await prisma.users.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true },
    })
    : null;

  const isMaintenanceMode = await Settings.maintenanceMode();
  const maintenanceMessage = await Settings.maintenanceMessage();

  const user = dbUser
    ? { id: dbUser.id, name: dbUser.name, isAdmin: session!.user.isAdmin }
    : null;

  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <div className="min-h-screen flex mx-auto text-text dark:text-text-dark">
          <NavBar user={user} />
          <div className="mx-auto flex-1 flex flex-col bg-page dark:bg-page-dark">
            {isMaintenanceMode && (
              <div className="sticky top-0 z-1 bg-[#ebdec5] dark:bg-[#4f3605] text-[#6a3200] dark:text-[#f4b63c] p-4 text-center w-full selection:bg-[#6a3200] selection:text-[#f4b63c]">
                <strong>Maintenance Mode:</strong> {maintenanceMessage}
              </div>
            )}

            <div className="flex-1 flex items-center flex-col">
              <main id="content" className="w-full flex-1 flex flex-col items-center relative">
                {children}
              </main>
              {user && <Footer />}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
