import { cookies } from "next/headers";
import { hashPassword, createSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  discoverIssuer,
  getOidcConfig,
  hasOidcAdminPermission,
  identityFromClaims,
  verifyIdentity,
  isSafeNext,
} from "@/lib/oidc";
import { Settings } from "@/services/settings.service";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";
import { randomBytes } from "node:crypto";

function clearCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, name: string) {
  cookieStore.set(name, "", { httpOnly: true, maxAge: 0, path: "/" });
}

const OIDC_ERROR_CODES = new Set([
  "access_denied",
  "signin_expired",
  "signin_failed",
  "idp_unreachable",
]);

const DEFAULT_TOKEN_MAX_AGE = 60 * 60 * 24;

function tokenMaxAge(value: unknown, unitInSeconds: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.ceil(value / unitInSeconds) * unitInSeconds
    : DEFAULT_TOKEN_MAX_AGE;
}

function redirectToLogin(requestUrl: string, error: string, next: string | undefined) {
  const loginUrl = new URL("/auth/login", requestUrl);
  loginUrl.searchParams.set("error", error);
  if (isSafeNext(next ?? null)) loginUrl.searchParams.set("next", next ?? "");
  return Response.redirect(loginUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const state = cookieStore.get("oidc_state")?.value;
  const nonce = cookieStore.get("oidc_nonce")?.value;
  const codeVerifier = cookieStore.get("oidc_code_verifier")?.value;
  const next = cookieStore.get("oidc_next")?.value;
  const code = url.searchParams.get("code");

  for (const cookie of ["oidc_state", "oidc_nonce", "oidc_code_verifier", "oidc_next"]) {
    clearCookie(cookieStore, cookie);
  }

  const providerError = url.searchParams.get("error");
  if (providerError && state && state === url.searchParams.get("state")) {
    const errorCode = OIDC_ERROR_CODES.has(providerError) ? providerError : "signin_failed";
    return redirectToLogin(request.url, errorCode, next);
  }

  if (!state || !nonce || !codeVerifier || !code || state !== url.searchParams.get("state")) {
    return Response.json({ error: "Invalid OIDC callback" }, { status: 400 });
  }

  try {
    const config = getOidcConfig(request.url);
    const discovery = await discoverIssuer(config.issuer);
    const tokenResponse = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code_verifier: codeVerifier,
      }),
    });
    if (!tokenResponse.ok) {
      console.error("OIDC token exchange failed:", await tokenResponse.text());
      return Response.json({ error: "OIDC authentication failed" }, { status: 401 });
    }

    const tokens = await tokenResponse.json() as {
      id_token?: string;
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_expires_in?: number;
      token_type?: string;
    };
    let identity = tokens.id_token
      ? await verifyIdentity(tokens.id_token, discovery, config.clientId, nonce)
      : null;

    if (tokens.access_token && discovery.userinfo_endpoint) {
      const userinfoResponse = await fetch(discovery.userinfo_endpoint, {
        headers: { Authorization: `${tokens.token_type || "Bearer"} ${tokens.access_token}` },
      });
      if (userinfoResponse.ok) {
        const userinfoIdentity = identityFromClaims(await userinfoResponse.json());
        identity = identity
          ? { ...identity, claims: { ...identity.claims, ...userinfoIdentity.claims } }
          : userinfoIdentity;
      }
    }
    if (!identity) throw new Error("OIDC provider returned no usable identity");

    const isAdmin = hasOidcAdminPermission(identity.claims);
    let user = await prisma.users.findUnique({ where: { email: identity.email } });
    if (!user) {
      const defaultQuota = await Settings.defaultUserQuota();
      user = await prisma.users.create({
        data: {
          email: identity.email,
          name: identity.name,
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
          isAdmin,
          ...(defaultQuota !== null ? { quota: BigInt(defaultQuota) } : {}),
        },
      });
      await log({
        action: LogAction.USER_CREATED,
        message: `User ${identity.email} created an account through OIDC`,
        userId: user.id,
        meta: { email: identity.email, issuer: config.issuer },
      });
    } else if (process.env.OIDC_ROLE_SYNC === "sync") {
      user = await prisma.users.update({
        where: { id: user.id },
        data: { isAdmin },
      });
    } else if (process.env.OIDC_ROLE_SYNC === "never_demote" && isAdmin && !user.isAdmin) {
      user = await prisma.users.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    await createSession(user.id, user.email, user.isAdmin);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    if (tokens.access_token) {
      cookieStore.set("oidc_access_token", tokens.access_token, {
        ...cookieOptions,
        maxAge: tokenMaxAge(tokens.expires_in, 60),
      });
    }
    if (tokens.refresh_token) {
      cookieStore.set("oidc_refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: tokenMaxAge(tokens.refresh_expires_in, 60 * 60 * 24),
      });
    }
    if (tokens.id_token) {
      cookieStore.set("oidc_id_token", tokens.id_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24,
      });
    }
    await log({
      level: LogLevel.INFO,
      action: LogAction.AUTH_LOGIN,
      message: "User logged in through OIDC",
      userId: user.id,
      meta: { email: user.email, issuer: config.issuer },
    });

    const redirectPath = isSafeNext(next ?? null) ? (next ?? "/") : "/";
    return Response.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error("OIDC callback failed:", error);
    return Response.json({ error: "OIDC authentication failed" }, { status: 401 });
  }
}
