import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth";

const PUBLIC_EXACT = new Set(["/", "/docs", "/self-hosting"]);

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/file/",
  "/secret/",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/check-invite",
  "/api/download/",
  "/api/checkfile",
  "/api/secret/check",
  "/api/secret/get",
  "/api/health",
  "/api/services/",
  "/api/cron/check-expired",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.png",
  "/icon0.svg"
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_EXACT.has(pathname) || PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  const session = await getSession();
  if (!session?.id) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login?next=" + encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search), request.url));
  }

  if (session.isHeaderToken) {
    if (pathname.startsWith("/api/admin/") && !session.scopes.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasAccess = session.scopes.some((scope: string) => {
      const scopeCheck = scope.toLocaleLowerCase();
      if (scopeCheck === "admin") return true;
      if (scopeCheck === "read") return request.method === "GET";
      if (scopeCheck === "write") return request.method !== "DELETE";
      if (scopeCheck === "delete") return request.method === "DELETE";
      return false;
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack|favicon.ico|api/upload|opengraph-image|.*\\.svg|.*\\.png|.*\\.ico|.*\\.css|.*\\.js).*)"],
};
