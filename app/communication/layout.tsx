import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communication"
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
