import prisma from "@/lib/prisma";
import { createTokenService } from "@/lib/service";

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
      return new Response(JSON.stringify({ error: "Invitation code has expired" }), {
        status: 400,
      });
    }

    if (findInvitation.uses >= findInvitation.max_uses) {
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
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to join service" }), {
      status: 500,
    });
  }
}