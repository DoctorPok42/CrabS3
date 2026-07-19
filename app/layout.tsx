import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer, NavBar } from "@/components";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrabS3 - Simple S3 File Sharing",
  description: "No cloud. No bill. Just S3 buckets full of crabs. 🦀",
  abstract: "No cloud. No bill. Just S3 buckets full of crabs. 🦀",
  appleWebApp: {
    title: "CrabS3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex max-w-450 mx-auto bg-white dark:bg-[#16171a]! text-black dark:text-white">
        <NavBar />
        <div className=" mx-auto flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#16171a]">
          <div className="flex-1 overflow-y-auto flex items-center flex-col">
            {children}
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
