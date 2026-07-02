import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
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
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ invitationCode: invitation.code }), {
      status: 201,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to join service" }), {
      status: 500,
    });
  }
}
