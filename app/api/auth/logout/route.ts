import { deleteSession, getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import { log } from "@/services/log.service";
import { LogAction } from "@/types/log.types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "No active session found" }, { status: 401 });
  }

  await deleteSession();

  await log({
    action: LogAction.AUTH_LOGOUT,
    message: "User logged out",
    userId: session.userId,
    meta: { ip: getIp(request) },
  });

  return Response.json({ success: true });
}
