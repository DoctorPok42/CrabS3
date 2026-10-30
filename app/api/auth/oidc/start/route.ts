import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { discoverIssuer, getOidcConfig, isSafeNext } from "@/lib/oidc";

const STATE_COOKIE = "oidc_state";
const NONCE_COOKIE = "oidc_nonce";
const VERIFIER_COOKIE = "oidc_code_verifier";
const NEXT_COOKIE = "oidc_next";

function randomValue(): string {
  return randomBytes(32).toString("base64url");
}

export async function GET(request: Request) {
  try {
    const config = getOidcConfig(request.url);
    const discovery = await discoverIssuer(config.issuer);
    const state = randomValue();
    const nonce = randomValue();
    const codeVerifier = randomValue();
    const codeChallenge = Buffer.from(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier)),
    ).toString("base64url");
    const next = new URL(request.url).searchParams.get("next");
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 600,
      path: "/",
    };

    cookieStore.set(STATE_COOKIE, state, cookieOptions);
    cookieStore.set(NONCE_COOKIE, nonce, cookieOptions);
    cookieStore.set(VERIFIER_COOKIE, codeVerifier, cookieOptions);
    if (isSafeNext(next)) {
      cookieStore.set(NEXT_COOKIE, next, cookieOptions);
    } else {
      cookieStore.set(NEXT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    }

    const authorizationUrl = new URL(discovery.authorization_endpoint);
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: process.env.OIDC_SCOPES?.trim() || "openid profile email crabs3_permissions",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();

    return Response.redirect(authorizationUrl);
  } catch (error) {
    console.error("Failed to start OIDC login:", error);
    return Response.json({ error: "OIDC login is not configured" }, { status: 503 });
  }
}
