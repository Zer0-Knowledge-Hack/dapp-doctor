import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, isAuthConfigured } from '@/lib/auth/options';

export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

/** Without Google credentials the sign-in routes do not exist, rather than failing halfway through. */
function notEnabled() {
  return NextResponse.json({ error: 'Sign-in is not enabled on this deployment.' }, { status: 404 });
}

type Handler = (request: Request, context: { params: Promise<{ nextauth: string[] }> }) => Promise<Response>;

const guarded: Handler = (request, context) => (isAuthConfigured() ? (handler as Handler)(request, context) : Promise.resolve(notEnabled()));

export { guarded as GET, guarded as POST };
