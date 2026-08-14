import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel"
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
