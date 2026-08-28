import { getSession } from "@/lib/auth";
import { log } from "@/services/log.service";
import {
  getSettingsForAdmin,
  resetSetting,
  setSetting,
  syncSettingsCatalog,
} from "@/services/settings.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { SETTINGS_BY_KEY, SettingKey } from "@/types/settings.types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }

    const settings = await getSettingsForAdmin();
    return Response.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { key, value } = await request.json();

    const definition = SETTINGS_BY_KEY[key];
    if (!definition) {
      return Response.json({ error: "Unknown setting" }, { status: 404 });
    }

    const previous = (await getSettingsForAdmin()).find((setting) => setting.key === key);

    const result = await setSetting(key as SettingKey, value, session.userId);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const updated = (await getSettingsForAdmin()).find((setting) => setting.key === key);

    await log({
      level: LogLevel.WARN,
      action: LogAction.ADMIN_ACTION,
      message: `Setting "${definition.label}" changed`,
      userId: session.userId,
      meta: {
        key,
        from: previous?.rawValue ?? definition.default,
        to: String(value),
        category: definition.category,
      },
    });

    return Response.json({ message: "Setting updated", setting: updated });
  } catch (error) {
    console.error("Error updating setting:", error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: "Failed to update setting",
      userId: session.userId,
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return Response.json({ error: "Failed to update setting" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key || !SETTINGS_BY_KEY[key]) {
    return Response.json({ error: "Unknown setting" }, { status: 404 });
  }

  await resetSetting(key as SettingKey);

  const reverted = (await getSettingsForAdmin()).find((setting) => setting.key === key);

  await log({
    level: LogLevel.WARN,
    action: LogAction.ADMIN_ACTION,
    message: `Setting "${SETTINGS_BY_KEY[key].label}" reset to default`,
    userId: session.userId,
    meta: { key, default: SETTINGS_BY_KEY[key].default },
  });

  return Response.json({ message: "Setting reset", setting: reverted });
}

export async function POST() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const created = await syncSettingsCatalog(session.userId);

  await log({
    level: LogLevel.INFO,
    action: LogAction.ADMIN_ACTION,
    message: `Settings catalog synced (${created} created)`,
    userId: session.userId,
    meta: { created },
  });

  return Response.json({ message: "Catalog synced", created, settings: await getSettingsForAdmin() });
}
