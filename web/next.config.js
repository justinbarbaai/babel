/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Security headers on every route.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // OBS browser sources (overlay/reader) must stay embeddable anywhere.
      { source: "/overlay", headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }] },
      { source: "/reader", headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }] },
    ];
  },
};

module.exports = nextConfig;
