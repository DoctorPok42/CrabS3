import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { publicPageRobots } from "@/lib/publicSite";
import Overview from "@/components/marketing/Overview";
import PublicFooter from "@/components/marketing/PublicFooter";
import PublicHeader from "@/components/marketing/PublicHeader";
import UploadView from "@/components/UploadView";

export const metadata: Metadata = {
  title: {
    absolute: "CrabS3 — Self-hosted S3 file & secret sharing",
  },
  alternates: { canonical: "/" },
  robots: publicPageRobots,
};

export default async function Home() {
  const session = await getSession();

  if (session) return <UploadView />;

  return (
    <>
      <PublicHeader signedIn={false} />
      <Overview />
      <PublicFooter />
    </>
  );
}
