import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
    console.log("Protected route accessed:", req.nextUrl.pathname)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to auth pages without authentication
        if (pathname.startsWith("/auth")) {
          return true
        }
        
        // Allow access to API routes (they handle their own auth)
        if (pathname.startsWith("/api")) {
          return true
        }
        
        // Allow access to root path without authentication
        if (pathname === "/") {
          return true
        }

        // Allow public portfolio pages (unauthenticated brands can view creator profiles)
        if (pathname.startsWith("/portfolio")) {
          return true
        }
        
        // Require authentication for protected routes
        if (
          pathname.startsWith("/creator") ||
          pathname.startsWith("/agency") ||
          pathname.startsWith("/proposal")
        ) {
          return !!token
        }
        
        // Allow access to other public routes
        return true
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
}
