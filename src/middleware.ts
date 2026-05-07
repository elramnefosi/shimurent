import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  if (isLoginPage || isApiRoute) return NextResponse.next()

  const auth = req.cookies.get('shimurent-auth')?.value
  const secret = process.env.AUTH_SECRET
  if (!auth || !secret || auth !== secret) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
