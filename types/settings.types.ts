import { LogLevel } from "./log.types";

export enum SettingType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  JSON = "JSON",
}

export enum SettingCategory {
  LOGGING = "LOGGING",
  STORAGE = "STORAGE",
  UPLOAD = "UPLOAD",
  SECURITY = "SECURITY",
  EMAIL = "EMAIL",
  MAINTENANCE = "MAINTENANCE",
}

export const SettingKeys = {
  // LOGGING
  LOG_MIN_LEVEL: "log_min_level",
  LOG_RETENTION_DAYS: "log_retention_days",
  LOG_CONSOLE_ENABLED: "log_console_enabled",

  // STORAGE
  EXPIRED_FILE_POLICY: "expired_file_policy",
  STORAGE_DEFAULT_USER_QUOTA: "storage_default_user_quota",
  STORAGE_DEFAULT_SERVICE_QUOTA: "storage_default_service_quota",
  STORAGE_DEDUPE_ENABLED: "storage_dedupe_enabled",
  STORAGE_STALE_MULTIPART_HOURS: "storage_stale_multipart_hours",

  // UPLOAD
  UPLOAD_MAX_FILE_SIZE: "upload_max_file_size",
  UPLOAD_MAX_FILES_PER_FOLDER: "upload_max_files_per_folder",
  UPLOAD_ALLOWED_EXTENSIONS: "upload_allowed_extensions",
  UPLOAD_BLOCKED_EXTENSIONS: "upload_blocked_extensions",
  UPLOAD_DEFAULT_EXPIRY_DAYS: "upload_default_expiry_days",
  UPLOAD_EXPIRATION_DAYS: "upload_expiration_days",
  UPLOAD_DEFAULT_MAX_DOWNLOADS: "upload_default_max_downloads",

  // SECURITY
  SECURITY_SESSION_DURATION_HOURS: "security_session_duration_hours",
  SECURITY_INVITE_EXPIRY_HOURS: "security_invite_expiry_hours",
  SECURITY_FILE_PASSWORD_MIN_LENGTH: "security_file_password_min_length",
  SECURITY_SECRET_MAX_VIEWS: "security_secret_max_views",
  SECURITY_CLAMAV_ENABLED: "security_clamav_enabled",
  SECURITY_CLAMAV_DELETE_INFECTED: "security_clamav_delete_infected",
  SECURITY_CLAMAV_BLOCK_UNSCANNED: "security_clamav_block_unscanned",
  SECURITY_CLAMAV_MAX_SCAN_SIZE: "security_clamav_max_scan_size",

  // EMAIL
  EMAIL_NOTIFICATIONS_ENABLED: "email_notifications_enabled",
  EMAIL_NOTIFY_ON_UPLOAD: "email_notify_on_upload",
  EMAIL_NOTIFY_ON_DOWNLOAD: "email_notify_on_download",
  EMAIL_NOTIFY_RECIPIENT: "email_notify_recipient",

  // MAINTENANCE
  MAINTENANCE_MODE: "maintenance_mode",
  MAINTENANCE_MESSAGE: "maintenance_message",
  MAINTENANCE_CLEANUP_ENABLED: "maintenance_cleanup_enabled",
} as const;

export type SettingKey = (typeof SettingKeys)[keyof typeof SettingKeys];

export interface SettingDefinition {
  key: SettingKey;
  type: SettingType;
  category: SettingCategory;
  label: string;
  description?: string;
  default: string;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  isBytes?: boolean;
  warning?: string;
  multiline?: boolean;
}

export const SETTINGS_CATALOG: SettingDefinition[] = [
  // ─────────────────────────── LOGGING ───────────────────────────
  {
    key: SettingKeys.LOG_MIN_LEVEL,
    type: SettingType.STRING,
    category: SettingCategory.LOGGING,
    label: "Minimum log level",
    description: "Events below this level are dropped and never written to database.",
    default: "INFO",
    options: Object.values(LogLevel),
  },
  {
    key: SettingKeys.LOG_RETENTION_DAYS,
    type: SettingType.NUMBER,
    category: SettingCategory.LOGGING,
    label: "Log retention",
    description: "Logs older than this are purged by the cleanup cron. 0 keeps them forever.",
    default: "90",
    unit: "days",
    min: 0,
    max: 3650,
  },
  {
    key: SettingKeys.LOG_CONSOLE_ENABLED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.LOGGING,
    label: "Mirror logs to console",
    description: "Also print every persisted log line to the server console.",
    default: "false",
  },

  // ─────────────────────────── STORAGE ───────────────────────────
  {
    key: SettingKeys.EXPIRED_FILE_POLICY,
    type: SettingType.STRING,
    category: SettingCategory.STORAGE,
    label: "Expired file policy",
    description: "What happens when a file hits its expiry date or download limit.",
    default: "cold",
    options: ["cold", "delete"],
  },
  {
    key: SettingKeys.STORAGE_DEFAULT_USER_QUOTA,
    type: SettingType.NUMBER,
    category: SettingCategory.STORAGE,
    label: "Default user quota",
    description: "Applied to newly created accounts. -1 means unlimited.",
    default: "10737418240",
    unit: "bytes",
    isBytes: true,
    min: -1,
  },
  {
    key: SettingKeys.STORAGE_DEFAULT_SERVICE_QUOTA,
    type: SettingType.NUMBER,
    category: SettingCategory.STORAGE,
    label: "Default service quota",
    description: "Applied to newly created services. -1 means unlimited.",
    default: "10737418240",
    unit: "bytes",
    isBytes: true,
    min: -1,
  },
  {
    key: SettingKeys.STORAGE_DEDUPE_ENABLED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.STORAGE,
    label: "Content deduplication",
    description: "Reuse the stored object when an identical hash is uploaded again.",
    default: "true",
  },
  {
    key: SettingKeys.STORAGE_STALE_MULTIPART_HOURS,
    type: SettingType.NUMBER,
    category: SettingCategory.STORAGE,
    label: "Abort stale multipart uploads after",
    description: "Unfinished multipart uploads older than this are aborted on S3.",
    default: "48",
    unit: "hours",
    min: 1,
    max: 720,
  },

  // ─────────────────────────── UPLOAD ────────────────────────────
  {
    key: SettingKeys.UPLOAD_MAX_FILE_SIZE,
    type: SettingType.NUMBER,
    category: SettingCategory.UPLOAD,
    label: "Maximum file size",
    description: "Rejected before the multipart session starts. 0 means no limit.",
    default: "0",
    unit: "bytes",
    isBytes: true,
    min: 0,
  },
  {
    key: SettingKeys.UPLOAD_MAX_FILES_PER_FOLDER,
    type: SettingType.NUMBER,
    category: SettingCategory.UPLOAD,
    label: "Maximum files per folder",
    description: "0 means no limit.",
    default: "50",
    unit: "files",
    min: 0,
    max: 10000,
  },
  {
    key: SettingKeys.UPLOAD_ALLOWED_EXTENSIONS,
    type: SettingType.JSON,
    category: SettingCategory.UPLOAD,
    label: "Allowed extensions",
    description: 'JSON array such as [".pdf", ".zip"]. Empty array allows everything.',
    default: "[]",
  },
  {
    key: SettingKeys.UPLOAD_BLOCKED_EXTENSIONS,
    type: SettingType.JSON,
    category: SettingCategory.UPLOAD,
    label: "Blocked extensions",
    description: "Always rejected, even when the allow list is empty.",
    default: '[".exe", ".bat", ".cmd", ".scr", ".ps1"]',
  },
  {
    key: SettingKeys.UPLOAD_DEFAULT_EXPIRY_DAYS,
    type: SettingType.NUMBER,
    category: SettingCategory.UPLOAD,
    label: "Default expiry",
    description: "Used when the uploader does not pick one. 0 means never expires.",
    default: "7",
    unit: "days",
    min: 1,
    max: 3650,
  },
  {
    key: SettingKeys.UPLOAD_EXPIRATION_DAYS,
    type: SettingType.JSON,
    category: SettingCategory.UPLOAD,
    label: "Expiration options",
    description: "JSON array of allowed expiry days for uploaders to choose from.",
    default: "[1, 7, 14, 21, 30]",
  },
  {
    key: SettingKeys.UPLOAD_DEFAULT_MAX_DOWNLOADS,
    type: SettingType.NUMBER,
    category: SettingCategory.UPLOAD,
    label: "Default download limit",
    description: "Used when the uploader does not pick one. 0 means unlimited.",
    default: "0",
    unit: "downloads",
    min: 0,
  },

  // ────────────────────────── SECURITY ───────────────────────────
  {
    key: SettingKeys.SECURITY_SESSION_DURATION_HOURS,
    type: SettingType.NUMBER,
    category: SettingCategory.SECURITY,
    label: "Session duration",
    description: "Lifetime of a login session cookie. Existing sessions keep their own expiry.",
    default: "48",
    unit: "hours",
    min: 1,
    max: 8760,
  },
  {
    key: SettingKeys.SECURITY_INVITE_EXPIRY_HOURS,
    type: SettingType.NUMBER,
    category: SettingCategory.SECURITY,
    label: "Invitation expiry",
    description: "How long a signup invitation link stays valid.",
    default: "24",
    unit: "hours",
    min: 1,
    max: 8760,
  },
  {
    key: SettingKeys.SECURITY_FILE_PASSWORD_MIN_LENGTH,
    type: SettingType.NUMBER,
    category: SettingCategory.SECURITY,
    label: "File password minimum length",
    description: "Minimum length when a sender protects a transfer with a password.",
    default: "8",
    unit: "characters",
    min: 4,
    max: 128,
  },
  {
    key: SettingKeys.SECURITY_SECRET_MAX_VIEWS,
    type: SettingType.NUMBER,
    category: SettingCategory.SECURITY,
    label: "Secret maximum views",
    description: "Upper bound a user can set on a shared secret, 0 means unlimited.",
    default: "0",
    unit: "views",
    min: 0,
    max: 1000,
  },
  {
    key: SettingKeys.SECURITY_CLAMAV_ENABLED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.SECURITY,
    label: "ClamAV scanning",
    description: "Scan every completed upload in the background.",
    default: "true",
  },
  {
    key: SettingKeys.SECURITY_CLAMAV_DELETE_INFECTED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.SECURITY,
    label: "Delete infected files",
    description: "Remove the object from S3 on detection. When off, the file is only flagged.",
    default: "true",
  },
  {
    key: SettingKeys.SECURITY_CLAMAV_BLOCK_UNSCANNED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.SECURITY,
    label: "Block downloads until scanned",
    description: "Downloads return 202 while the scan is still pending.",
    default: "false",
    warning: "Adds a short delay between upload and first download.",
  },
  {
    key: SettingKeys.SECURITY_CLAMAV_MAX_SCAN_SIZE,
    type: SettingType.NUMBER,
    category: SettingCategory.SECURITY,
    label: "Maximum scan size",
    description: "Files above this size are skipped and left unscanned. 0 means no limit.",
    default: "19922944000",
    unit: "bytes",
    isBytes: true,
    min: 0,
  },

  // ──────────────────────────── EMAIL ────────────────────────────
  {
    key: SettingKeys.EMAIL_NOTIFICATIONS_ENABLED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.EMAIL,
    label: "Email notifications",
    description: "Master switch for upload and download notifications. Invitations are always sent.",
    default: "true",
  },
  {
    key: SettingKeys.EMAIL_NOTIFY_ON_UPLOAD,
    type: SettingType.BOOLEAN,
    category: SettingCategory.EMAIL,
    label: "Notify sender on upload",
    default: "true",
  },
  {
    key: SettingKeys.EMAIL_NOTIFY_ON_DOWNLOAD,
    type: SettingType.BOOLEAN,
    category: SettingCategory.EMAIL,
    label: "Notify sender on download",
    default: "true",
  },
  {
    key: SettingKeys.EMAIL_NOTIFY_RECIPIENT,
    type: SettingType.BOOLEAN,
    category: SettingCategory.EMAIL,
    label: "Notify recipient",
    description: "Send the share link to the recipient address when one is provided.",
    default: "true",
  },

  // ───────────────────────── MAINTENANCE ─────────────────────────
  {
    key: SettingKeys.MAINTENANCE_MODE,
    type: SettingType.BOOLEAN,
    category: SettingCategory.MAINTENANCE,
    label: "Maintenance mode",
    description: "Blocks uploads and downloads for everyone except admins.",
    default: "false",
    warning: "Non-admin users will not be able to upload or download while this is on.",
  },
  {
    key: SettingKeys.MAINTENANCE_MESSAGE,
    type: SettingType.STRING,
    category: SettingCategory.MAINTENANCE,
    label: "Maintenance message",
    description: "Shown to users while maintenance mode is active.",
    default: "CrabS3 is temporarily unavailable for maintenance. Please try again later.",
    multiline: true,
  },
  {
    key: SettingKeys.MAINTENANCE_CLEANUP_ENABLED,
    type: SettingType.BOOLEAN,
    category: SettingCategory.MAINTENANCE,
    label: "Automatic cleanup",
    description: "Let the cron expire files, purge old logs and abort stale uploads.",
    default: "true",
  },
];

export const SETTINGS_BY_KEY: Record<string, SettingDefinition> = Object.fromEntries(
  SETTINGS_CATALOG.map((definition) => [definition.key, definition])
);

export const CATEGORY_LABELS: Record<SettingCategory, string> = {
  [SettingCategory.LOGGING]: "Logging",
  [SettingCategory.STORAGE]: "Storage",
  [SettingCategory.UPLOAD]: "Upload",
  [SettingCategory.SECURITY]: "Security",
  [SettingCategory.EMAIL]: "Email",
  [SettingCategory.MAINTENANCE]: "Maintenance",
};

export type SettingValue = string | number | boolean | unknown[] | Record<string, unknown>;

export function parseSettingValue(raw: string, type: SettingType): SettingValue {
  switch (type) {
    case SettingType.NUMBER: {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    case SettingType.BOOLEAN:
      return raw === "true";
    case SettingType.JSON:
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    default:
      return raw;
  }
}

export function serializeSettingValue(value: SettingValue, type: SettingType): string {
  if (type === SettingType.JSON) return JSON.stringify(value);
  if (type === SettingType.BOOLEAN) return value ? "true" : "false";
  return String(value);
}

export function normalizeSettingValue(definition: SettingDefinition, raw: string): string {
  return serializeSettingValue(parseSettingValue(raw, definition.type), definition.type);
}

export function isDefaultSettingValue(definition: SettingDefinition, raw: string): boolean {
  return (
    normalizeSettingValue(definition, raw) === normalizeSettingValue(definition, definition.default)
  );
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  value?: string;
}

export function validateSettingValue(
  definition: SettingDefinition,
  value: SettingValue
): ValidationResult {
  switch (definition.type) {
    case SettingType.NUMBER: {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) return { ok: false, error: `${definition.label} must be a number` };
      if (definition.min !== undefined && parsed < definition.min) {
        return { ok: false, error: `${definition.label} must be at least ${definition.min}` };
      }
      if (definition.max !== undefined && parsed > definition.max) {
        return { ok: false, error: `${definition.label} must be at most ${definition.max}` };
      }
      return { ok: true, value: String(parsed) };
    }
    case SettingType.BOOLEAN: {
      if (typeof value !== "boolean" && value !== "true" && value !== "false") {
        return { ok: false, error: `${definition.label} must be a boolean` };
      }
      return { ok: true, value: value === true || value === "true" ? "true" : "false" };
    }
    case SettingType.JSON: {
      let parsed: unknown = value;
      if (typeof value === "string") {
        try {
          parsed = JSON.parse(value);
        } catch {
          return { ok: false, error: `${definition.label} must be valid JSON` };
        }
      }
      if (!Array.isArray(parsed) && typeof parsed !== "object") {
        return { ok: false, error: `${definition.label} must be a JSON array or object` };
      }
      return { ok: true, value: JSON.stringify(parsed) };
    }
    default: {
      const raw = String(value);
      if (definition.options && !definition.options.includes(raw)) {
        return { ok: false, error: `${definition.label} must be one of: ${definition.options.join(", ")}` };
      }
      return { ok: true, value: raw };
    }
  }
}

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytesSetting(bytes: number): string {
  if (bytes === -1) return "Unlimited";
  if (bytes === 0) return "0 B";
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** index;
  return `${Math.round(value * 100) / 100} ${SIZE_UNITS[index]}`;
}
