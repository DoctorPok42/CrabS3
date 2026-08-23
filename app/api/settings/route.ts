import { getSession } from "@/lib/auth";
import { getSettingsForAdmin } from "@/services/settings.service";
import { SettingValue } from "@/types/settings.types";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const settingsKeys = searchParams.get("keys");
    if (!settingsKeys) {
      return new Response(JSON.stringify({ error: "Missing settingsKeys parameter" }), { status: 400 });
    }

    const settings = (await getSettingsForAdmin()).filter((setting) => settingsKeys.split(",").includes(setting.key));
    if (!settings) {
      return new Response(JSON.stringify({ error: "Setting not found" }), { status: 404 });
    }


    return new Response(JSON.stringify({
      settings: settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, SettingValue>),
    }), { status: 200 });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }
}
