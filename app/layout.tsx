import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Footer, NavBar } from "@/components";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex max-w-450 mx-auto text-text dark:text-text-dark">
        <NavBar />
        <div className=" mx-auto flex-1 flex flex-col overflow-hidden bg-page dark:bg-page-dark">
          <div className="flex-1 overflow-y-auto flex items-center flex-col">
            {children}
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
