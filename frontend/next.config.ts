import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * remotePatterns para next/image.
 *
 * - `{ protocol: "https", hostname: "**" }` cubre TODO el tráfico de producción:
 *   el assets-service se expone por HTTPS bajo su dominio público, así que no hace
 *   falta ningún patrón extra en Railway.
 * - El patrón HTTP extra existe solo para servir uploads en texto plano
 *   (desarrollo local, o un assets-service alcanzado por red interna sin TLS).
 *   En dev cae al default `http://localhost:3002` si la variable no está seteada.
 * - Si `ASSETS_SERVICE_URL` no está definida o es una URL inválida, se omite el
 *   patrón HTTP en vez de tirar el build. Esto importa porque el build corre dentro
 *   del contenedor Docker, donde esa variable normalmente NO existe.
 */
function httpAssetsPattern() {
  const raw = process.env.ASSETS_SERVICE_URL || (isProduction ? "" : "http://localhost:3002");
  if (!raw.startsWith("http://")) return null;
  try {
    const { hostname, port } = new URL(raw);
    if (!hostname) return null;
    return {
      protocol: "http" as const,
      hostname,
      ...(port ? { port } : {}),
      pathname: "/uploads/**",
    };
  } catch {
    // URL malformada → seguimos sin el patrón HTTP; https:** sigue cubriendo prod.
    return null;
  }
}

const assetsHttpPattern = httpAssetsPattern();

const nextConfig: NextConfig = {
  // Requerido por frontend/Dockerfile: produce .next/standalone/server.js.
  // Sin esto el `COPY --from=builder /app/.next/standalone ./` falla y la imagen no se construye.
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      ...(assetsHttpPattern ? [assetsHttpPattern] : []),
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
      ...(isProduction ? [{
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
