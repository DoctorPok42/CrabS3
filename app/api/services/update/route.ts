import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    if (!body?.id || !body?.status || !session?.user?.id || !session?.user?.isAdmin) {
      return new Response(JSON.stringify({ error: "Missing id, status, or user ID" }), {
        status: 400,
      });
    }
    const { id, status } = body;

    await prisma.services.update({
      where: { id: Number(id) },
      data: { status },
    });

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