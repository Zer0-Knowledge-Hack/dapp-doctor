import { getServerSession, type Session } from 'next-auth';
import { chooseUserId } from './identity';
import { authOptions, isAuthConfigured } from './options';

/** The signed-in session, or null when there is none or sign-in is not set up. */
export async function currentSession(): Promise<Session | null> {
  if (!isAuthConfigured()) return null;
  try {
    return await getServerSession(authOptions);
  } catch {
    // A broken or tampered cookie is treated as signed out, never as an error page.
    return null;
  }
}

/** The user id this request may act as: the session's, or an anonymous id the browser sent. */
export async function requestUserId(claimedUserId: unknown): Promise<string | null> {
  const session = await currentSession();
  return chooseUserId({ sessionUserId: session?.appUserId, claimedUserId });
}
