import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logs"
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
