import prisma from "@/lib/prisma";
import { Settings } from "@/services/settings.service";

export interface UploadPolicyInput {
  filename: string;
  size: bigint;
  folderId: string;
  isAdmin?: boolean;
  password?: string | null;
}

export interface UploadPolicyResult {
  ok: boolean;
  error?: string;
  status?: number;
}

const ALLOWED: UploadPolicyResult = { ok: true };


export async function checkMaintenance(isAdmin?: boolean): Promise<UploadPolicyResult> {
  if (!(await Settings.maintenanceMode()) || isAdmin) return ALLOWED;
  return { ok: false, status: 503, error: await Settings.maintenanceMessage() };
}

export async function checkPasswordStrength(
  password?: string | null
): Promise<UploadPolicyResult> {
  if (!password) return ALLOWED;

  const minLength = await Settings.filePasswordMinLength();
  if (password.length < minLength) {
    return {
      ok: false,
      status: 400,
      error: `The password must be at least ${minLength} characters long.`,
    };
  }

  return ALLOWED;
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

function normalize(extensions: string[]): string[] {
  return extensions
    .filter((extension) => typeof extension === "string")
    .map((extension) => {
      const trimmed = extension.trim().toLowerCase();
      return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
    });
}

export async function checkUploadPolicy(input: UploadPolicyInput): Promise<UploadPolicyResult> {
  const [maintenance, maxSize, allowed, blocked, maxFiles] = await Promise.all([
    Settings.maintenanceMode(),
    Settings.uploadMaxFileSize(),
    Settings.uploadAllowedExtensions(),
    Settings.uploadBlockedExtensions(),
    Settings.uploadMaxFilesPerFolder(),
  ]);

  if (maintenance && !input.isAdmin) {
    return { ok: false, status: 503, error: await Settings.maintenanceMessage() };
  }

  const passwordCheck = await checkPasswordStrength(input.password);
  if (!passwordCheck.ok) return passwordCheck;

  if (maxSize > 0 && input.size > BigInt(maxSize)) {
    const limitGb = (maxSize / 1024 ** 3).toFixed(2);
    return {
      ok: false,
      status: 413,
      error: `This file is larger than the ${limitGb} GB limit allowed on this instance.`,
    };
  }

  const extension = extensionOf(input.filename);
  const blockedList = normalize(Array.isArray(blocked) ? blocked : []);
  const allowedList = normalize(Array.isArray(allowed) ? allowed : []);

  if (extension && blockedList.includes(extension)) {
    return { ok: false, status: 415, error: `${extension} files are not accepted here.` };
  }

  if (allowedList.length > 0 && !allowedList.includes(extension)) {
    return {
      ok: false,
      status: 415,
      error: `Only these file types are accepted: ${allowedList.join(", ")}.`,
    };
  }

  if (maxFiles > 0) {
    const count = await prisma.files.count({ where: { folder_id: input.folderId } });
    if (count >= maxFiles) {
      return {
        ok: false,
        status: 409,
        error: `This transfer already holds the maximum of ${maxFiles} files.`,
      };
    }
  }

  return ALLOWED;
}

export async function resolveUploadDefaults(metadata: {
  expireAfter?: string | number | null;
  maxDownloads?: string | number | null;
}): Promise<{ expiresAt: Date | null; maxDownloads: number | null }> {
  const [defaultDays, defaultMaxDownloads] = await Promise.all([
    Settings.uploadDefaultExpiryDays(),
    Settings.uploadDefaultMaxDownloads(),
  ]);

  const days =
    metadata.expireAfter !== undefined && metadata.expireAfter !== null && metadata.expireAfter !== ""
      ? Number(metadata.expireAfter)
      : defaultDays;

  const downloads =
    metadata.maxDownloads !== undefined && metadata.maxDownloads !== null && metadata.maxDownloads !== ""
      ? Number(metadata.maxDownloads)
      : defaultMaxDownloads;

  return {
    expiresAt: days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null,
    maxDownloads: downloads > 0 ? downloads : null,
  };
}
