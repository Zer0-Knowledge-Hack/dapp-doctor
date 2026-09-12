import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    /** DApp Doctor's user id for this account: what RevenueCat and the history are keyed by. */
    appUserId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    appUserId?: string;
  }
}
