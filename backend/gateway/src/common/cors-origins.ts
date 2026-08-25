/**
 * Orígenes permitidos por CORS, leídos de `FRONTEND_URL`.
 *
 * `FRONTEND_URL` acepta UNA lista separada por comas para poder servir el mismo
 * gateway desde varios hosts a la vez (por ejemplo el dominio propio y el de
 * Railway, que queda como respaldo si el DNS del dominio propio falla).
 *
 *   FRONTEND_URL="https://vinciinventa.com,https://frontend-production-ed47.up.railway.app"
 *
 * Normalización de cada entrada:
 *   - se recortan espacios,
 *   - se descartan las entradas vacías (una coma de más NO habilita un origen ""),
 *   - se saca la barra final: el header `Origin` del browser nunca la lleva, así que
 *     `https://vinciinventa.com/` en la variable no matchearía nunca,
 *   - se pasa a minúsculas (esquema y host son case-insensitive; el browser siempre
 *     manda minúsculas) y se deduplica preservando el orden.
 *
 * Es una lista EXPLÍCITA: sin wildcards ni matching por patrón. Este es el borde
 * de seguridad del sistema; agregar un host es editar la variable, no aflojar la regla.
 */
export const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000';

export function parseAllowedOrigins(raw?: string): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, '').toLowerCase())
    .filter((o) => o.length > 0);

  // Sin variable seteada (o con una que solo tenía comas/espacios) se cae al
  // default de desarrollo, igual que antes de soportar listas.
  return origins.length > 0 ? [...new Set(origins)] : [DEFAULT_ALLOWED_ORIGIN];
}
