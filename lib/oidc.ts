import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

interface OidcConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface OidcIdentity {
  email: string;
  name: string;
  claims: JWTPayload;
}

const discoveryCache = new Map<string, OidcConfiguration>();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function isOidcEnabled(): boolean {
  return !!process.env.OIDC_ISSUER_URL
    && !!process.env.OIDC_CLIENT_ID
    && !!process.env.OIDC_CLIENT_SECRET;
}

export function getOidcConfig(requestUrl: string) {
  const issuer = requiredEnv("OIDC_ISSUER_URL").replace(/\/$/, "");
  const clientId = requiredEnv("OIDC_CLIENT_ID");
  const clientSecret = requiredEnv("OIDC_CLIENT_SECRET");
  const baseUrl = process.env.BASE_URL?.trim() || requestUrl;
  const redirectUri = process.env.OIDC_REDIRECT_URI?.trim()
    || new URL("/api/auth/oidc/callback", baseUrl).toString();
  const postLogoutRedirectUri = process.env.OIDC_POST_LOGOUT_REDIRECT_URI?.trim()
    || new URL("/auth/login", redirectUri).toString();

  return { issuer, clientId, clientSecret, redirectUri, postLogoutRedirectUri };
}

export async function discoverIssuer(issuer: string): Promise<OidcConfiguration> {
  const cached = discoveryCache.get(issuer);
  if (cached) return cached;

  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`OIDC discovery failed with status ${response.status}`);
  }

  const configuration = await response.json() as OidcConfiguration;
  if (!configuration.authorization_endpoint || !configuration.token_endpoint || !configuration.jwks_uri) {
    throw new Error("OIDC discovery response is incomplete");
  }
  discoveryCache.set(issuer, configuration);
  return configuration;
}

export async function verifyIdentity(
  idToken: string,
  configuration: OidcConfiguration,
  clientId: string,
  nonce: string,
): Promise<OidcIdentity> {
  const jwks = createRemoteJWKSet(new URL(configuration.jwks_uri));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: configuration.issuer,
    audience: clientId,
  });
  if (payload.nonce !== nonce) throw new Error("OIDC nonce validation failed");

  return identityFromClaims(payload);
}

export function identityFromClaims(claims: JWTPayload): OidcIdentity {
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email || claims.email_verified === false) {
    throw new Error("OIDC identity has no verified email");
  }

  const name = typeof claims.name === "string" && claims.name.trim()
    ? claims.name.trim()
    : email;
  return { email, name, claims };
}

export function isSafeNext(value: string | null): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

export function hasOidcAdminPermission(claims: JWTPayload): boolean {
  const claimName = process.env.OIDC_ADMIN_CLAIM?.trim() || "permissions";
  const adminValues = new Set(
    (process.env.OIDC_ADMIN_VALUES || "admin")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const value = claims[claimName];
  const values = Array.isArray(value) ? value : [value];
  return values.some((item) => typeof item === "string" && adminValues.has(item));
}
