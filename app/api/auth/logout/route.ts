import { deleteSession } from "@/lib/auth";
import { log } from "@/services/log.service";
import { LogAction } from "@/types/log.types";

export async function POST(request: Request) {
  await deleteSession();

  await log({
    action: LogAction.AUTH_LOGOUT,
    message: "User logged out",
    userId: Number(request.headers.get("x-user-id")) || undefined,
    meta: { ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || undefined },
  });

  return Response.json({ success: true });
}
