import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  // Next.js 16 blocks cross-origin requests to dev resources by default.
  // Chrome DevTools MCP navigates via the literal IP (127.0.0.1), which the
  // browser treats as a different origin from `localhost`, so the page bundle,
  // font endpoints, and HMR socket are silently dropped. This unblocks them
  // for any dev host (adjust the list if you also test from LAN IPs).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default withPWA(nextConfig);
