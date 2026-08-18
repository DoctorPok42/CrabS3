import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { resolveStorageKey } from "@/lib/storage-key";

interface DedupeMetadata {
  filename: string;
  contentType?: string;
  size: string;
  maxDownloads?: string | null;
  emailRecipient?: string;
  expireAfter?: "1" | "7" | "14" | "21" | "30";
  password?: string;
  emailMessage?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hash, folderId, folderName, metadata } = (await request.json()) as {
      hash: string;
      folderId: string;
      folderName?: string | null;
      metadata: DedupeMetadata;
    };

    if (!hash || !folderId || !metadata?.size) {
      return Response.json({ error: "Missing hash, folderId, or metadata" }, { status: 400 });
    }

    const sizeBytes = BigInt(metadata.size);

    const candidate = await prisma.files.findFirst({
      where: {
        user_id: session.userId,
        hash,
        size: sizeBytes,
        uploaded_at: { not: null },
        infected: false,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      orderBy: { uploaded_at: "desc" },
    });

    const eligible = candidate
      && (candidate.max_downloads === null || (candidate.download_count ?? 0) < candidate.max_downloads);

    if (!eligible || !candidate) {
      return Response.json({ duplicate: false }, { status: 200 });
    }

    const storageKey = resolveStorageKey(candidate);
    if (!storageKey) {
      return Response.json({ duplicate: false }, { status: 200 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.userId },
      select: { quota: true },
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userFiles = await prisma.files.aggregate({
      where: { user_id: session.userId },
      _sum: { size: true },
    });
    const currentUsage = userFiles._sum.size || BigInt(0);

    if (user.quota !== BigInt(-1) && currentUsage + sizeBytes > user.quota) {
      const quotaGB = Number(user.quota) / (1024 * 1024 * 1024);
      const usedGB = Number(currentUsage) / (1024 * 1024 * 1024);
      const fileGB = Number(sizeBytes) / (1024 * 1024 * 1024);

      return Response.json(
        { error: `Exceeded quota. You have used ${usedGB.toFixed(2)} GB / ${quotaGB.toFixed(2)} GB. This file is ${fileGB.toFixed(2)} GB.` },
        { status: 413 }
      );
    }

    await prisma.folders.upsert({
      where: { id: folderId },
      update: { name: folderName || "" },
      create: { id: folderId, name: folderName || "" },
    });

    const fileId = randomUUID();

    await prisma.files.create({
      data: {
        id: fileId,
        filename: metadata.filename,
        content_type: candidate.content_type,
        size: candidate.size,
        folder_id: folderId,
        user_id: session.userId,
        storage: candidate.storage,
        storage_key: storageKey,
        hash,
        uploaded_at: new Date(),
        infected: false,
        scanned_at: new Date(),
        max_downloads: metadata.maxDownloads ? Number.parseInt(metadata.maxDownloads) : null,
        download_count: 0,
        expires_at: metadata.expireAfter
          ? new Date(Date.now() + Number.parseInt(metadata.expireAfter) * 24 * 60 * 60 * 1000)
          : null,
        email_sender: session.email,
        email_recipient: metadata.emailRecipient || null,
        password_hash: metadata.password ? await bcrypt.hash(metadata.password, 10) : null,
        email_message: metadata.emailMessage || null,
      },
    });

    await log({
      level: LogLevel.INFO,
      action: LogAction.UPLOAD,
      message: `Deduplicated upload of "${metadata.filename}" against an existing file - no bytes re-uploaded`,
      userId: session.userId,
      meta: { fileId, folderId, sourceFileId: candidate.id, sizeBytes: sizeBytes.toString() },
    });

    return Response.json(
      {
        duplicate: true,
        fileId,
        folderId,
        filename: metadata.filename,
        folderName: folderName || null,
        etag: "deduplicated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dedupe-check error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
