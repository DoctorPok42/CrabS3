import { getSession } from "@/lib/auth";
import { log } from "@/services/log.service";
import { getSettingsForAdmin, resetSetting, setSetting, syncSettingsCatalog } from "@/services/settings.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { SettingKey, SETTINGS_BY_KEY } from "@/types/settings.types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const settings = await getSettingsForAdmin();
    if (!settings) {
      return new Response(JSON.stringify({ error: "Settings not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ settings }), { status: 200 });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch settings" }), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  try {
    const { key, value } = await request.json();

    const definition = SETTINGS_BY_KEY[key];
    if (!definition) {
      return new Response(JSON.stringify({ error: "Invalid setting key" }), { status: 400 });
    }

    const previous = (await getSettingsForAdmin()).find((setting) => setting.key === key);
    if (!previous) {
      return new Response(JSON.stringify({ error: "Setting not found" }), { status: 404 });
    }

    const result = await setSetting(key, value, session.userId);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Failed to update setting" }), { status: 400 });
    }

    const updatedSetting = await getSettingsForAdmin().then((settings) => settings.find((setting) => setting.key === key));
    if (!updatedSetting) {
      return new Response(JSON.stringify({ error: "Updated setting not found" }), { status: 404 });
    }

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

    return Response.json({ message: "Setting updated", setting: updatedSetting });
  } catch (error) {
    console.error("Error updating settings:", error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: `Failed to update settings`,
      userId: session.userId,
      meta: { error: error instanceof Error ? error.message : String(error) },
    })
    return new Response(JSON.stringify({ error: "Failed to update settings" }), { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key || !SETTINGS_BY_KEY[key]) {
      return new Response(JSON.stringify({ error: "Unknown setting key" }), { status: 400 });
    }

    await resetSetting(key as SettingKey);

    const reverted = await getSettingsForAdmin().then((settings) => settings.find((setting) => setting.key === key));
    if (!reverted) {
      return new Response(JSON.stringify({ error: "Reverted setting not found" }), { status: 404 });
    }

    await log({
      level: LogLevel.WARN,
      action: LogAction.ADMIN_ACTION,
      message: `Setting "${SETTINGS_BY_KEY[key].label}" reset to default`,
      userId: session.userId,
      meta: { key, category: SETTINGS_BY_KEY[key].category },
    });

    return Response.json({ message: "Setting reset to default", setting: reverted });
  } catch (error) {
    console.error("Error deleting settings:", error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.ADMIN_ACTION,
      message: `Failed to delete settings`,
      userId: session.userId,
      meta: { error: error instanceof Error ? error.message : String(error) },
    });

    return new Response(JSON.stringify({ error: "Failed to delete settings" }), { status: 500 });
  }
}

export async function POST() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const created = await syncSettingsCatalog();

  await log({
    level: LogLevel.INFO,
    action: LogAction.ADMIN_ACTION,
    message: `Settings catalog synced (${created} created)`,
    userId: session.userId,
    meta: { created },
  });

  return Response.json({ message: "Catalog synced", created });
}
