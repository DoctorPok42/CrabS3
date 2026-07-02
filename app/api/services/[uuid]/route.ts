import { getServiceByUUID } from "@/lib/service";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    if (!uuid) {
      return new Response(JSON.stringify({ error: "Missing UUID" }), {
        status: 400,
      });
    }

    const service = await getServiceByUUID(uuid);
    if (!service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(service), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to fetch service" }), {
      status: 500,
    });
  }
}
