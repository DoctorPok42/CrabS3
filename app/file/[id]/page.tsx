import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicFolder } from "@/lib/files";
import FileView from "./FileView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const folder = await getPublicFolder(id);
  const first = folder.files[0];

  return {
    title: first
      ? `Download ${first.folderName || first.filename}`
      : "File not found",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
  };
}

export default async function FilePage({ params }: Readonly<Props>) {
  const { id } = await params;

  const folder = await getPublicFolder(id);
  if (!folder.exists) notFound();

  return <FileView id={id} initialFolder={folder} />;
}
