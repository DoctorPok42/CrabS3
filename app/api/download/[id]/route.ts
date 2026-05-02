import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const password = await request.json().then(data => data.password).catch(() => null);

    const metadata: { filename?: string; contentType?: string; maxDownloads?: string } = {};
    try {
      const file = await prisma.files.findUnique({
        where: { id: fileId },
        select: { password_hash: true, filename: true, size: true },
      });
      if (file?.password_hash) {
        if (!password) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, file.password_hash);
        if (!isPasswordValid) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        metadata.filename = file.filename;
        metadata.contentType = "application/octet-stream";
        metadata.maxDownloads = file.size.toString();
      }
      if (!file) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        return Response.json({ error: "File not found" }, { status: 404 });
      }
      throw error;
    }

    return Response.json({
      status: "ok",
      filename: metadata.filename || fileId,
      contentType: metadata.contentType || "application/octet-stream"
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
