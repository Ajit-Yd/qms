import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect app pages; exclude API routes (self-guarded server-side),
     * Next.js internals, and common static assets.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};