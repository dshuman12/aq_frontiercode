import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [/^\/sign-in/, /^\/sign-up/, /^\/magic-link/];
const SESSION_COOKIE = "lecturn.session_token";

// Presence-only check; the API still validates each request, so this just short-circuits anonymous traffic.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ROUTES.some((re) => re.test(pathname))) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Skip Next internals and any path with a file extension so static assets aren't redirected to /sign-in.
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.).*)"],
};
