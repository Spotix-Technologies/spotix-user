import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware to protect authenticated routes.
 *
 * ── Protected Routes ──────────────────────────────────────────────────────────
 *
 * Routes that require authentication (user must have a valid session):
 *   - /home
 *   - /profile
 *   - /ticket-history
 *   - /referrals
 *   - /refund
 *   - /refund-track
 *   - /event/* (dynamic event pages)
 *
 * How it works:
 *   1. Checks for the spotix_u_at httpOnly cookie (access token)
 *   2. If missing, redirects to /auth/login with redirect query parameter
 *   3. If present, allows the request to proceed
 *
 * Note: This is edge-level protection. The actual auth state is verified
 * on the client side using the useAuth hook and withAuth HOC.
 *
 * ── Login Redirect ────────────────────────────────────────────────────────────
 *
 * When a user is redirected to /auth/login, they'll see ?redirect=<path>
 * which can be used to redirect them back after successful authentication.
 */

const protectedPrefixes = [
  '/home',
  '/profile',
  '/ticket-history',
  '/referrals',
  '/refund',
  '/event',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the current path matches any protected route
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Check for the access token cookie
  const accessToken = request.cookies.get('spotix_u_at')

  if (!accessToken) {
    // Redirect to login with redirect parameter
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protect routes by path prefix
    '/home/:path*',
    '/profile/:path*',
    '/ticket-history/:path*',
    '/referrals/:path*',
    '/refund/:path*',
    '/event/:path*',
  ],
}
