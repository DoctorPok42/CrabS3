import { getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { createTokenService } from "@/lib/service";
import { log } from "@/services/log.service";
import { Settings } from "@/services/settings.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    if (!body?.name || !session?.user?.id) {
      return new Response(JSON.stringify({ error: "Missing name or user ID" }), {
        status: 400,
      });
    }

    const folderId = randomUUID();

    await prisma.folders.create({
      data: {
        id: folderId,
        name: body.name,
      },
    });

    const defaultQuota = await Settings.defaultServiceQuota();

    const servicePrisma = await prisma.services.create({
      data: {
        name: body.name,
        token: "",
        folder_id: folderId,
        uuid: randomUUID(),
        ...(defaultQuota !== null ? { quota: defaultQuota } : {}),
      },
    });

    const service = await createTokenService(servicePrisma.id, body.name) as {
      id: number;
      name: string;
      quota: bigint;
    };

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.CREATE_SERVICE,
        message: `Service ${service.name} created`,
        userId: session.user.id,
        meta: { serviceId: service.id, ip: getIp(request) },
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
