/**
 * Saneamiento de texto controlado por el cliente antes de interpolarlo en una
 * notificación.
 *
 * `assetTitle` viaja en el body de `POST /requests` y NO se valida contra
 * assets-service (no hay llamada cruzada en el MVP). O sea: es una cadena
 * 100% controlada por quien crea la solicitud, que después se interpola en el
 * body de una notificación entregada a `ownerId` — un usuario con el que el
 * atacante no tiene ninguna relación previa. Es el canal de phishing más
 * directo del producto: "Alguien quiere licenciar «<lo que quiera el atacante>»".
 *
 * No alcanza con escapar HTML: el frontend renderiza el body como texto y React
 * ya escapa. El riesgo acá es de CONTENIDO, no de markup:
 *   - saltos de línea y control chars para simular varios párrafos y falsear
 *     un mensaje del sistema debajo del texto legítimo;
 *   - overrides bidi (U+202E y familia) para reordenar visualmente lo que se lee;
 *   - zero-width para partir palabras que un filtro buscaría literales;
 *   - URLs para mandar al usuario a un sitio de credenciales.
 */

// C0 (sin \t \n \r, que se colapsan como espacio más abajo), DEL y C1.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Bidi embedding/override/isolate + LRM/RLM/ALM.
const BIDI = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;
// Zero-width y BOM.
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

/**
 * Deja el texto en una sola línea imprimible. Se aplica a lo que se PERSISTE:
 * el título sigue siendo el que mandó el cliente, solo que sin los caracteres
 * que sirven para falsear su presentación.
 */
export function sanitizeSingleLine(value: string, maxLength: number): string {
  if (typeof value !== 'string') return '';

  const limpio = value
    .replace(CONTROL, '')
    .replace(BIDI, '')
    .replace(ZERO_WIDTH, '')
    .replace(/\s+/g, ' ')
    .trim();

  return limpio.length > maxLength ? `${limpio.slice(0, maxLength - 1).trimEnd()}…` : limpio;
}

// Esquemas explícitos, `www.` y cualquier host con TLD alfabético de 2+ letras.
const URL_LIKE =
  /\b(?:[a-z][a-z0-9+.-]*:\/\/\S+|www\.\S+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?)/gi;

/**
 * Texto apto para el body de una notificación: además del saneo de una línea,
 * neutraliza cualquier cosa que parezca una URL y recorta fuerte.
 *
 * Un título de activo legítimo no lleva URLs; un señuelo de phishing sí. Y el
 * recorte a 80 deja el título reconocible pero sin espacio para un pretexto
 * armado. El título completo sigue disponible en la fila de la solicitud, que
 * es donde el titular lo lee en contexto.
 */
export function sanitizeForNotification(value: string): string {
  const sinUrls = sanitizeSingleLine(value, 200).replace(URL_LIKE, '[enlace removido]');
  return sanitizeSingleLine(sinUrls, 80);
}
