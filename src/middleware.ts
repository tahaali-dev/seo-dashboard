import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    return null;
  }
  
  // Protect / and /dashboard
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }
  
  return null;
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
