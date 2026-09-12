import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { accountUserId } from './identity';

/**
 * Optional Google sign-in. It exists so a purchase and the diagnosis history
 * follow a person to any device; nothing in DApp Doctor requires it.
 *
 * Only the basic scopes are asked for (openid, email, profile), which Google
 * does not require an app to verify. Sessions are signed cookies (JWT): no
 * database, and no Google token is kept after sign-in.
 */

export function isAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // On sign-in only: turn the Google account into DApp Doctor's user id and
    // keep that, not the account's tokens.
    async jwt({ token, account }) {
      if (account?.provider === 'google' && account.providerAccountId) {
        token.appUserId = accountUserId(account.providerAccountId);
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.appUserId === 'string') session.appUserId = token.appUserId;
      return session;
    },
  },
};
