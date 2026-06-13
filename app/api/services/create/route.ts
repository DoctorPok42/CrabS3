import { getSession } from "@/lib/auth";
import { createTokenService } from "@/lib/service";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    if (!body?.name || !session?.user?.id) {
      return new Response(JSON.stringify({ error: "Missing name or user ID" }), {
        status: 400,
      });
    }

    const service = await createTokenService(body.name);

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.CREATE_SERVICE,
        message: `Service ${service.name} created`,
        userId: session.user.id,
        meta: { serviceId: service.id },
      });
    })();
    return new Response(JSON.stringify({ ...service, quota: Number(service.quota) }), {
      status: 201,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
