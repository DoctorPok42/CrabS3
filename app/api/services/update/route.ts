import { getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    if (!body?.id || !session?.user?.id || !session?.user?.isAdmin) {
      return new Response(JSON.stringify({ error: "Missing id, status, or user ID" }), {
        status: 400,
      });
    }
    const { id, status, img } = body;

    await prisma.services.update({
      where: { id: Number(id) },
      data: {
        ...(status ? { status } : {}),
        ...(img ? { image: img } : {})
      },
    });

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.UPDATE_SERVICE,
        message: `Service status updated`,
        userId: session.user.id,
        meta: { serviceId: Number(id), status, ip: getIp(request) },
      })
    })();

    return new Response(JSON.stringify({ message: "Service status updated" }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
