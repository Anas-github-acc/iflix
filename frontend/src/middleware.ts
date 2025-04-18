import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Exclude auth page and API routes from middleware
  if (request.nextUrl.pathname.startsWith('/auth') || 
      request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  try {
    // Verify token by calling the API route
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
      headers: {
        'Cookie': `accessToken=${token}`
      }
    });

    if (!verifyResponse.ok) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  } catch (_error) {
    console.error('Token verification error:', _error);
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
