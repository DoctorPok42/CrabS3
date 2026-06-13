import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/file/",
  "secret/",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/check-invite",
  "/api/download/",
  "/api/checkfile",
  "/api/secret/check",
  "/api/secret/get",
  "/api/health",
  "/api/services/upload",
  "/api/services/download",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  const session = request.cookies.get("session");
  if (!session?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack|favicon.ico|.*\\.svg|.*\\.png|.*\\.ico|.*\\.css|.*\\.js).*)"],
};
