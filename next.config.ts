import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Opening the app as 127.0.0.1 while Next bound to localhost (or the
  // other way around) is a cross-origin request to /_next/*. Host and
  // host:port both have to be listed or the warning comes back.
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '127.0.0.1:3000',
    'localhost:3000',
    '127.0.0.1:3001',
    'localhost:3001',
  ],
};

export default nextConfig;
