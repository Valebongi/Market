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

/**
 * Content-Security-Policy — subconjunto deliberadamente parcial.
 *
 * NO incluye `script-src` ni `default-src`. El App Router de Next inyecta
 * scripts inline con la data de hidratación (`self.__next_f.push(...)`), así que
 * un `script-src` sin `'unsafe-inline'` tira la app entera, y CON `'unsafe-inline'`
 * no aporta nada contra XSS. Hacerlo bien pide nonces por request, o sea
 * `middleware.ts` (que hoy no existe) y renderizado dinámico en todas las rutas
 * — eso mata el cacheo estático del catálogo. Es un cambio de arquitectura, no
 * una cabecera: queda reportado, no lo decide este archivo.
 *
 * Lo que sí entra son las directivas de alto valor y riesgo de rotura nulo,
 * verificadas contra el código actual:
 *
 * - `base-uri 'none'`: un `<base href="//evil.tld">` inyectado reescribe TODAS
 *   las URLs relativas de la página (scripts incluidos). Next nunca emite `<base>`.
 * - `object-src 'none'`: mata `<object>`/`<embed>` como vector de script.
 * - `frame-ancestors 'none'`: clickjacking. Equivalente moderno del
 *   `X-Frame-Options: DENY` de abajo, que los browsers nuevos ya ignoran.
 * - `form-action 'self'`: un formulario inyectado no puede exfiltrar a otro
 *   host. Todos los formularios de la app se manejan por `onSubmit`, ninguno
 *   tiene `action` nativo, así que no hay envío cross-origin que romper.
 * - `upgrade-insecure-requests`: acompaña al HSTS que ya está puesto. Va sólo en
 *   producción. `localhost` es un origen "potentially trustworthy" y la spec no
 *   lo upgradea, pero en dev el assets-service puede quedar detrás de otro host
 *   en texto plano — y ahí el upgrade rompe las imágenes sin avisar.
 */
const CONTENT_SECURITY_POLICY = [
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // Requerido por frontend/Dockerfile: produce .next/standalone/server.js.
  // Sin esto el `COPY --from=builder /app/.next/standalone ./` falla y la imagen no se construye.
  output: "standalone",

  // `X-Powered-By: Next.js` le regala al atacante el framework y, combinado con
  // el hash de los chunks, acota bastante la versión. No cuesta nada sacarlo.
  poweredByHeader: false,

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
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
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
