import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Baseline browser hardening. The app is a same-origin SPA with no third-party
 * scripts and no iframes, so 'self' plus the denials below is enforceable.
 *
 * script-src keeps 'unsafe-inline' because layout.tsx ships a static inline
 * theme bootstrap and Next injects inline hydration data. Switching to a
 * per-request nonce (see next/dist/docs/.../content-security-policy.md) removes
 * that, but forces every page to dynamic rendering — not worth it here.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  // 'self' covers the same-origin websocket Next dev uses for HMR.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Breaks plain-http dev, so production only.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking guard for browsers without frame-ancestors support.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // `/:path*` already matches /api, so this rule only adds what is
      // API-specific: attachment responses must never land in a shared cache.
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;