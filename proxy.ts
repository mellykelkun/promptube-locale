import { NextRequest, NextResponse } from "next/server";

const sessionCookieNames = [
  "promptube-admin.session_token",
  "__Secure-promptube-admin.session_token",
];
const twoFactorCookieNames = ["promptube-admin.two_factor", "__Secure-promptube-admin.two_factor"];
const publicPathPrefixes = [
  "/api/admin/auth/login",
  "/api/admin/2fa/verify",
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon.ico",
  "/login",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = sessionCookieNames.some((name) => request.cookies.has(name));
  const hasTwoFactorCookie = twoFactorCookieNames.some((name) => request.cookies.has(name));

  if (
    publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return NextResponse.next();
  }

  if (pathname === "/verify-2fa" || pathname.startsWith("/verify-2fa/")) {
    if (hasSessionCookie || hasTwoFactorCookie) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = hasTwoFactorCookie ? "/verify-2fa" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
