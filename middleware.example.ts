// middleware.example.ts
// If you are using Next.js on Vercel and have global protection/auth,
// this middleware exempts PWA public assets from auth to avoid 401 on manifest/ SW.
// Rename this file to `middleware.ts` at your project root when using Next.js.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/manifest.webmanifest',
  '/service-worker.js'
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/assets/icons/')) {
    // Skip auth/checks for public PWA assets
    return NextResponse.next()
  }

  // ...your existing protection here...
  return NextResponse.next()
}

export const config = {
  // Exclude PWA assets from middleware matching
  matcher: ['/((?!manifest\\.webmanifest|service-worker\\.js|assets/icons).*)']
}
