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
      <body className="min-h-full flex flex-col">
        <div className="flex items-center min-h-screen bg-white dark:bg-[#16171a]">
          <NavBar />
          <div className="min-h-screen w-full flex items-center flex-col lg:ml-69">
            {children}
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
