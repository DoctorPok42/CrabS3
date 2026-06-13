import { getSession } from "@/lib/auth";
import { deleteService } from "@/lib/service";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const id = request.url.split("/").pop();
    if (!id || !session?.user?.id || !session?.user?.isAdmin) {
      return new Response(JSON.stringify({ error: "Missing id or user ID" }), {
        status: 400,
      });
    }

    const result = await deleteService(Number(id));
    if (!result) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
      });
    }

    (async () => {
      log({
        level: LogLevel.INFO,
        action: LogAction.DELETE_SERVICE,
        message: `Service with ID ${id} deleted`,
        userId: session.user.id,
        meta: { serviceId: id },
      });
    })();

    return new Response(JSON.stringify({ message: "Service deleted" }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
