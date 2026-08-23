import prisma from "@/lib/prisma";
import {
  SETTINGS_BY_KEY,
  SETTINGS_CATALOG,
  SettingKey,
  SettingKeys,
  SettingValue,
  isDefaultSettingValue,
  parseSettingValue,
  validateSettingValue,
} from "@/types/settings.types";


const CACHE_TTL_MS = 60_000;

interface SettingsCache {
  values: Map<string, string>;
  expiresAt: number;
}

const globalForSettings = global as unknown as { settingsCache?: SettingsCache };

function emptyCache(): SettingsCache {
  return { values: new Map(), expiresAt: 0 };
}

async function loadSettings(): Promise<Map<string, string>> {
  const cache = globalForSettings.settingsCache;
  if (cache && Date.now() < cache.expiresAt) return cache.values;

  try {
    const rows = await prisma.settings.findMany({ select: { key: true, value: true } });
    const values = new Map<string, string>(
      rows.map((row: { key: string; value: string }) => [row.key, row.value])
    );
    globalForSettings.settingsCache = { values, expiresAt: Date.now() + CACHE_TTL_MS };
    return values;
  } catch (error) {
    console.error("Failed to load settings, using defaults:", error);
    return cache?.values ?? emptyCache().values;
  }
}

export function invalidateSettingsCache(): void {
  globalForSettings.settingsCache = emptyCache();
}

export async function getSetting<T = SettingValue>(key: SettingKey): Promise<T> {
  const definition = SETTINGS_BY_KEY[key];
  if (!definition) throw new Error(`Unknown setting key: ${key}`);

  const values = await loadSettings();
  const raw = values.get(key) ?? definition.default;
  return parseSettingValue(raw, definition.type) as T;
}

export async function getAllSettings(): Promise<Record<string, SettingValue>> {
  const values = await loadSettings();
  return Object.fromEntries(
    SETTINGS_CATALOG.map((definition) => [
      definition.key,
      parseSettingValue(values.get(definition.key) ?? definition.default, definition.type),
    ])
  );
}

export async function getSettingsForAdmin() {
  let rows: Array<{
    key: string;
    value: string;
    updated_at: Date;
    updated_by: number | null;
    user: { id: number; email: string } | null;
  }> = [];

  try {
    rows = await prisma.settings.findMany({
      include: { user: { select: { id: true, email: true } } },
    });
  } catch (error) {
    console.error("Failed to read settings table:", error);
  }

  const byKey = new Map(rows.map((row) => [row.key, row] as const));

  return SETTINGS_CATALOG.map((definition) => {
    const row = byKey.get(definition.key);
    const raw = row?.value ?? definition.default;

    return {
      ...definition,
      value: parseSettingValue(raw, definition.type),
      rawValue: raw,
      isDefault: isDefaultSettingValue(definition, raw),
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.user?.email ?? null,
    };
  });
}

export async function setSetting(
  key: SettingKey,
  value: SettingValue,
  userId?: number
): Promise<{ ok: boolean; error?: string }> {
  const definition = SETTINGS_BY_KEY[key];
  if (!definition) return { ok: false, error: `Unknown setting key: ${key}` };

  const validation = validateSettingValue(definition, value);
  if (!validation.ok || validation.value === undefined) {
    return { ok: false, error: validation.error };
  }

  await prisma.settings.upsert({
    where: { key },
    update: { value: validation.value, updated_by: userId ?? -1 },
    create: {
      key,
      value: validation.value,
      type: definition.type,
      category: definition.category,
      label: definition.label,
      description: definition.description ?? null,
      updated_by: userId ?? -1,
    },
  });

  invalidateSettingsCache();
  return { ok: true };
}

export async function resetSetting(key: SettingKey): Promise<void> {
  await prisma.settings.deleteMany({ where: { key } });
  invalidateSettingsCache();
}

export async function syncSettingsCatalog(): Promise<number> {
  const existing = await prisma.settings.findMany({ select: { key: true } });
  const known = new Set(existing.map((row) => row.key));
  const missing = SETTINGS_CATALOG.filter((definition) => !known.has(definition.key));

  if (missing.length > 0) {
    await prisma.settings.createMany({
      data: missing.map((definition) => ({
        key: definition.key,
        value: definition.default,
        type: definition.type,
        category: definition.category,
        label: definition.label,
        description: definition.description ?? null,
        updated_by: 1,
      })),
      skipDuplicates: true,
    });
    invalidateSettingsCache();
  }

  return missing.length;
}

export const Settings = {
  logMinLevel: () => getSetting<string>(SettingKeys.LOG_MIN_LEVEL),
  logRetentionDays: () => getSetting<number>(SettingKeys.LOG_RETENTION_DAYS),
  logConsoleEnabled: () => getSetting<boolean>(SettingKeys.LOG_CONSOLE_ENABLED),

  expiredFilePolicy: () => getSetting<string>(SettingKeys.EXPIRED_FILE_POLICY),
  defaultUserQuota: () => getSetting<number>(SettingKeys.STORAGE_DEFAULT_USER_QUOTA),
  defaultServiceQuota: () => getSetting<number>(SettingKeys.STORAGE_DEFAULT_SERVICE_QUOTA),
  dedupeEnabled: () => getSetting<boolean>(SettingKeys.STORAGE_DEDUPE_ENABLED),
  staleMultipartHours: () => getSetting<number>(SettingKeys.STORAGE_STALE_MULTIPART_HOURS),

  uploadMaxFileSize: () => getSetting<number>(SettingKeys.UPLOAD_MAX_FILE_SIZE),
  uploadMaxFilesPerFolder: () => getSetting<number>(SettingKeys.UPLOAD_MAX_FILES_PER_FOLDER),
  uploadAllowedExtensions: () => getSetting<string[]>(SettingKeys.UPLOAD_ALLOWED_EXTENSIONS),
  uploadBlockedExtensions: () => getSetting<string[]>(SettingKeys.UPLOAD_BLOCKED_EXTENSIONS),
  uploadDefaultExpiryDays: () => getSetting<number>(SettingKeys.UPLOAD_DEFAULT_EXPIRY_DAYS),
  uploadExpirationDays: () => getSetting<number[]>(SettingKeys.UPLOAD_EXPIRATION_DAYS),
  uploadDefaultMaxDownloads: () => getSetting<number>(SettingKeys.UPLOAD_DEFAULT_MAX_DOWNLOADS),

  sessionDurationHours: () => getSetting<number>(SettingKeys.SECURITY_SESSION_DURATION_HOURS),
  inviteExpiryHours: () => getSetting<number>(SettingKeys.SECURITY_INVITE_EXPIRY_HOURS),
  filePasswordMinLength: () => getSetting<number>(SettingKeys.SECURITY_FILE_PASSWORD_MIN_LENGTH),
  secretMaxViews: () => getSetting<number>(SettingKeys.SECURITY_SECRET_MAX_VIEWS),
  clamavEnabled: () => getSetting<boolean>(SettingKeys.SECURITY_CLAMAV_ENABLED),
  clamavDeleteInfected: () => getSetting<boolean>(SettingKeys.SECURITY_CLAMAV_DELETE_INFECTED),
  clamavBlockUnscanned: () => getSetting<boolean>(SettingKeys.SECURITY_CLAMAV_BLOCK_UNSCANNED),
  clamavMaxScanSize: () => getSetting<number>(SettingKeys.SECURITY_CLAMAV_MAX_SCAN_SIZE),

  emailEnabled: () => getSetting<boolean>(SettingKeys.EMAIL_NOTIFICATIONS_ENABLED),
  emailNotifyOnUpload: () => getSetting<boolean>(SettingKeys.EMAIL_NOTIFY_ON_UPLOAD),
  emailNotifyOnDownload: () => getSetting<boolean>(SettingKeys.EMAIL_NOTIFY_ON_DOWNLOAD),
  emailNotifyRecipient: () => getSetting<boolean>(SettingKeys.EMAIL_NOTIFY_RECIPIENT),

  maintenanceMode: () => getSetting<boolean>(SettingKeys.MAINTENANCE_MODE),
  maintenanceMessage: () => getSetting<string>(SettingKeys.MAINTENANCE_MESSAGE),
  cleanupEnabled: () => getSetting<boolean>(SettingKeys.MAINTENANCE_CLEANUP_ENABLED),
};

export { SettingType } from "@/types/settings.types";
