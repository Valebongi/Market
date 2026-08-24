import type { NextConfig } from "next";

// Parse the assets service URL so the remotePattern adapts to any environment.
// In production (HTTPS), the https:** pattern already covers it.
// This extra pattern is only needed for local HTTP development.
const assetsServiceUrl = process.env.ASSETS_SERVICE_URL || "http://localhost:3002";
const isHttpAssets = assetsServiceUrl.startsWith("http://");
const assetsHostname = isHttpAssets ? new URL(assetsServiceUrl).hostname : null;
const assetsPort = isHttpAssets ? (new URL(assetsServiceUrl).port || undefined) : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      ...(isHttpAssets && assetsHostname ? [{
        protocol: "http" as const,
        hostname: assetsHostname,
        ...(assetsPort ? { port: assetsPort } : {}),
        pathname: "/uploads/**",
      }] : []),
    ],
  },

  async headers() {
    return [
      // Rutas privadas: noindex a nivel HTTP
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // Assets estáticos: caché agresivo solo en producción
      // (en dev los chunks no tienen content-hash → no cachear o el browser sirve JS viejo)
      ...(process.env.NODE_ENV === "production" ? [{
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      }] : []),
      // Imágenes optimizadas
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      // Cabeceras de seguridad para todas las rutas
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS: fuerza HTTPS por 1 año
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
