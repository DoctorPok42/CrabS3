import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { createTokenService } from "@/lib/service";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.code) {
      return new Response(JSON.stringify({ error: "Missing code" }), {
        status: 400,
      });
    }

    const findInvitation = await prisma.invites.findFirst({
      where: {
        code: body.code,
      },
      include: {
        service: true
      }
    });
    if (!findInvitation) {
      return new Response(JSON.stringify({ error: "Invalid invitation code" }), {
        status: 400,
      });
    }

    if (findInvitation.expires_at && findInvitation.expires_at < new Date()) {
      (async () => {
        log({
          level: LogLevel.WARN,
          action: LogAction.SERVICE_INVITE_USED,
          message: `Invitation code ${findInvitation.code} has expired for service ${findInvitation.service.name}`,
          meta: {
            serviceId: findInvitation.service.id,
            invitationId: findInvitation.id,
            ip: getIp(request),
          },
        });
      })();

      return new Response(JSON.stringify({ error: "Invitation code has expired" }), {
        status: 400,
      });
    }

    if (findInvitation.uses >= findInvitation.max_uses) {
      (async () => {
        log({
          level: LogLevel.WARN,
          action: LogAction.SERVICE_INVITE_USED,
          message: `Invitation code ${findInvitation.code} has reached its maximum uses for service ${findInvitation.service.name}`,
          meta: {
            serviceId: findInvitation.service.id,
            invitationId: findInvitation.id,
            ip: getIp(request),
          },
        });
      })();

      return new Response(JSON.stringify({ error: "Invitation code has reached its maximum uses" }), {
        status: 400,
      });
    }

    await prisma.invites.update({
      where: {
        id: findInvitation.id,
      },
      data: {
        uses: findInvitation.uses + 1,
      },
    });

    const token = await createTokenService(findInvitation.service_id, findInvitation.service.name, undefined, true);
    if (!token) {
      return new Response(JSON.stringify({ error: "Failed to create token" }), {
        status: 500,
      });
    }

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.SERVICE_INVITE_USED,
        message: `Invitation code ${findInvitation.code} used for service ${findInvitation.service.name}`,
        meta: {
          serviceId: findInvitation.service.id,
          invitationId: findInvitation.id,
          ip: getIp(request),
        },
      });
    })();

    return new Response(
      JSON.stringify({
        token,
        service: {
          ...findInvitation.service,
          quota: Number(findInvitation.service.quota),
          id: Number(findInvitation.service.id),
        },
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    (async () => {
      log({
        level: LogLevel.ERROR,
        action: LogAction.SERVICE_INVITE_USED,
        message: `Failed to use invitation: ${error}`,
        meta: {
          ip: getIp(request),
        },
      });
    })();

    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to join service" }), {
      status: 500,
    });
  }
}