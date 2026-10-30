import { deleteSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import { log } from "@/services/log.service";
import { LogAction } from "@/types/log.types";
import { cookies } from "next/headers";
import { discoverIssuer, getOidcConfig } from "@/lib/oidc";

export async function POST(request: Request) {
  await deleteSession();

  await log({
    action: LogAction.AUTH_LOGOUT,
    message: "User logged out",
    userId: Number(request.headers.get("x-user-id")) || undefined,
    meta: { ip: getIp(request) },
  });

  const cookieStore = await cookies();
  const idToken = cookieStore.get("oidc_id_token")?.value;
  for (const cookie of ["oidc_id_token", "oidc_access_token", "oidc_refresh_token"]) {
    cookieStore.set(cookie, "", { httpOnly: true, maxAge: 0, path: "/" });
  }

  let logoutUrl: string | null = null;
  if (idToken && process.env.OIDC_ISSUER_URL && process.env.OIDC_CLIENT_ID) {
    try {
      const config = getOidcConfig(request.url);
      const discovery = await discoverIssuer(config.issuer);
      if (discovery.end_session_endpoint) {
        const url = new URL(discovery.end_session_endpoint);
        url.search = new URLSearchParams({
          id_token_hint: idToken,
          client_id: config.clientId,
          post_logout_redirect_uri: config.postLogoutRedirectUri,
        }).toString();
        logoutUrl = url.toString();
      }
    } catch (error) {
      console.error("Failed to prepare OIDC logout:", error);
    }
  }

  return Response.json({ success: true, logoutUrl });
}
