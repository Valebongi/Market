/**
 * Generacion de slugs para las URLs publicas de activos.
 *
 * CONTRATO: el slug es INMUTABLE una vez creado.
 * ------------------------------------------------------------------
 * Se deriva del titulo en `create()` y NUNCA se regenera en `update()`, aunque
 * el titulo cambie. No es un descuido: el slug es la URL publica del activo
 * (`/assets/<slug>`). Regenerarlo al editar el titulo rompe todo enlace ya
 * compartido y toda URL ya indexada, y obliga a mantener una tabla de 301.
 *
 * Si alguna vez hace falta cambiarlo, la operacion NO es "regenerar el slug":
 * es crear el nuevo, conservar el viejo como alias y responder 301. Eso es un
 * modelo de datos distinto (tabla de slugs historicos) y una decision de
 * producto, no un `update` mas.
 */

/**
 * Tope de longitud. La columna es TEXT (sin limite en Postgres), asi que esto es
 * higiene de URL, no una restriccion del schema.
 */
export const SLUG_MAX_LENGTH = 100;

/**
 * Slug de reserva cuando el titulo no deja ni un caracter utilizable: titulo
 * entero en emojis, en cirilico, en CJK, o solo signos de puntuacion. Sin esto
 * el slug quedaria vacio y chocaria contra el UNIQUE con cualquier otro titulo
 * igual de intraducible.
 */
export const SLUG_FALLBACK = 'activo';

/** Diacriticos combinantes que deja `normalize('NFD')` al separar los acentos. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Convierte un titulo en un slug ASCII apto para URL.
 *
 * El paso clave es `normalize('NFD')`: descompone cada caracter acentuado en su
 * letra base mas un diacritico combinante, que despues se borra. Sin eso, el
 * filtro de caracteres se come la letra entera y no solo la tilde:
 *
 *   "Diseno Unico" con tildes    ->  antes: "diseo-nico"       ahora: "diseno-unico"
 *   "Gestion Logistica" con tildes -> antes: "gestin-logstica" ahora: "gestion-logistica"
 *
 * En un marketplace en español eso no era un caso borde: degradaba
 * sistematicamente cualquier titulo con acento o con ñ.
 */
export function slugify(text: string): string {
  const base = (text ?? '')
    // "ñ" -> "n" + U+0303 ; "ó" -> "o" + U+0301 ; "ü" -> "u" + U+0308
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    // Todo lo que no sea ASCII alfanumerico pasa a ser separador: espacios,
    // guiones bajos, signos de pregunta y exclamacion (incluidos los de
    // apertura), comillas rectas y tipograficas, emojis y alfabetos no latinos.
    // Las corridas colapsan en un unico guion.
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) return SLUG_FALLBACK;
  if (base.length <= SLUG_MAX_LENGTH) return base;

  // Se corta en el ultimo separador dentro del limite para no partir una palabra
  // por la mitad. Si ese corte deja menos de la mitad del slug (caso de una sola
  // palabra larguisima), se prefiere el corte duro antes que un slug casi vacio.
  const cut = base.slice(0, SLUG_MAX_LENGTH);
  const lastDash = cut.lastIndexOf('-');
  const truncated = lastDash > SLUG_MAX_LENGTH / 2 ? cut.slice(0, lastDash) : cut;

  return truncated.replace(/-+$/, '') || SLUG_FALLBACK;
}

/**
 * Escapa un slug para interpolarlo dentro de un RegExp.
 *
 * Hoy `slugify` solo emite `[a-z0-9-]`, asi que en la practica no hay nada que
 * escapar. Se hace igual para que la funcion siga siendo correcta si alguien
 * afloja el filtro de caracteres. El guion no se escapa: fuera de una clase de
 * caracteres ya es literal.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A partir de los slugs ya ocupados que empiezan con `base`, devuelve el
 * siguiente disponible: `base`, o `base-2`, `base-3`, ...
 *
 * Reemplaza al sufijo `-${Date.now()}` anterior, que producia
 * `mi-marca-1787654321098`: 13 digitos pegados al slug, no deterministas, y
 * feos en una URL que existe justamente para ser legible.
 *
 * `taken` puede traer ruido, porque la consulta se hace con `startsWith`:
 * buscando "mi-marca" tambien vuelve "mi-marca-registrada". Solo cuentan los
 * que matchean exactamente `base` o `base-<n>`.
 */
export function nextSlugCandidate(base: string, taken: readonly string[]): string {
  const pattern = new RegExp('^' + escapeRegExp(base) + '(?:-(\\d+))?$');

  let baseTaken = false;
  let maxSuffix = 1;

  for (const slug of taken) {
    const match = pattern.exec(slug);
    if (!match) continue;
    if (match[1] === undefined) {
      baseTaken = true;
      continue;
    }
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > maxSuffix) maxSuffix = n;
  }

  if (!baseTaken) return base;
  return `${base}-${maxSuffix + 1}`;
}

/**
 * `true` si el error es la violacion del UNIQUE de `slug`.
 *
 * Se comprueba por duck typing en vez de importar
 * `Prisma.PrismaClientKnownRequestError` a proposito: los tests instancian el
 * servicio con un Prisma falso y no tienen por que quedar atados a resolver
 * `@prisma/client` desde el workspace de test.
 */
export function isSlugUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; meta?: { target?: unknown } } | null;
  if (!err || err.code !== 'P2002') return false;

  const target = err.meta?.target;
  if (Array.isArray(target)) return target.some((t) => String(t).includes('slug'));
  if (typeof target === 'string') return target.includes('slug');
  // Segun el conector, Prisma no siempre puebla `meta.target`. `slug` es el
  // unico UNIQUE de la tabla `assets`, asi que un P2002 sin detalle es este.
  return true;
}
