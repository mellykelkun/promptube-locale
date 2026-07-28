import { NextRequest, NextResponse } from "next/server";

const sessionCookieName = "promptube-admin.session_token";
const publicPathPrefixes = ["/api/auth", "/api/health", "/_next", "/favicon.ico", "/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return NextResponse.next();
  }

  if (!request.cookies.has(sessionCookieName)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
