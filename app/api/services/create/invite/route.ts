import { getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await request.json();
    if (!body?.serviceId) {
      return new Response(JSON.stringify({ error: "Missing serviceId or email" }), {
        status: 400,
      });
    }

    const service = await prisma.services.findUnique({
      where: { id: Number(body.serviceId) },
    });
    if (!service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
      });
    }

    const invitation = await prisma.invites.create({
      data: {
        service_id: service.id,
        max_uses: 100,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        created_at: new Date(),
        code: Math.floor(100000 + Math.random() * 900000).toString(), // Random 6 numeric code
        uses: 0,
      },
    });
    if (!invitation) {
      (async () => {
        log({
          level: LogLevel.ERROR,
          action: LogAction.SERVICE_INVITE_CREATED,
          message: `Failed to create invitation for service ${service.name}`,
          userId: session.user.id,
          meta: {
            serviceId: service.id,
            ip: getIp(request),
          },
        });
      })();

      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
      });
    }

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.SERVICE_INVITE_CREATED,
        message: `Invitation code ${invitation.code} created for service ${service.name}`,
        userId: session.user.id,
        meta: {
          serviceId: service.id,
          invitationId: invitation.id,
          ip: getIp(request),
        },
      });
    })();

    return new Response(JSON.stringify({ invitationCode: invitation.code }), {
      status: 201,
    });
  } catch (error) {
    (async () => {
      log({
        level: LogLevel.ERROR,
        action: LogAction.SERVICE_INVITE_CREATED,
        message: `Failed to create invitation: ${error}`,
        userId: (await getSession())?.user?.id,
        meta: {
          ip: getIp(request),
        },
      });
    })();

    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
      status: 500,
    });
  }
}
