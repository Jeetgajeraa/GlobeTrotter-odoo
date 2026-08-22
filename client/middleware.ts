import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // 1. Static files & Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Public routes: Landing page ("/"), Auth ("/auth"), Public shared itineraries ("/trips/share/*")
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname === "/auth" || pathname.startsWith("/auth/");
  const isPublicSharedTrip = pathname.startsWith("/trips/share/");

  const isPublicRoute = isLandingPage || isAuthPage || isPublicSharedTrip;

  // 3. Authenticated user visiting /auth -> redirect to home
  if (isAuthPage && token) {
    const redirectUrl = request.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 4. Unauthenticated user visiting protected route -> redirect to /auth
  if (!isPublicRoute && !token) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
