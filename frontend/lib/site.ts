/**
 * Origen canónico del sitio. **Fuente única de verdad.**
 *
 * Alimenta `metadataBase` del layout raíz, o sea que resuelve TODAS las URLs
 * relativas de Open Graph, Twitter Cards y canonicals de todas las páginas.
 *
 * Existe porque el fallback estaba duplicado literal en 6 archivos y uno de
 * ellos —el layout raíz, justamente el que alimenta `metadataBase`— decía
 * `https://davinci-inventa.com`, un dominio distinto del que usan `robots.ts` y
 * `sitemap.ts`. Es el mismo patrón de constante copiada que dejó la categoría
 * `project` fuera del filtro del catálogo.
 *
 * No redeclarar el fallback en ningún otro archivo: importar de acá.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://vinciinventa.com";
