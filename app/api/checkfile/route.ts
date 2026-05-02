import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return Response.json({ error: "Missing fileId" }, { status: 400 });
    }

    const file = await prisma.files.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        password_hash: true,
        filename: true,
        size: true,
        expires_at: true,
        download_count: true,
        max_downloads: true,
      },
    })

    if (!file) {
      return Response.json({ exists: false }, { status: 200 });
    }

    if (file.expires_at! > new Date() && (file.max_downloads === null || file.download_count! < file.max_downloads)) {
      return Response.json({
        exists: true,
        hasPassword: !!file.password_hash,
        filename: file.filename,
        size: Number(file.size)
      }, { status: 200 });
    }

    return Response.json({ exists: false }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Checkfile error:", errorMessage);
    return Response.json({ error: "Internal server error: " + errorMessage }, { status: 500 });
  }
}
