/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Sugerencias cuando el nombre exacto no está en ninguna extensión
 * ═══════════════════════════════════════════════════════════════════════════
 * El pedido tenía dos advertencias explícitas: no inundar RDAP, y que las
 * sugerencias sean plausibles como marca y no ruido generado. Las dos cosas
 * empujan en la misma dirección — generar POCO y BIEN — así que este archivo
 * produce una lista corta y RANKEADA, y el llamador se queda con las primeras.
 *
 * ── Por qué la lista de TLDs extra es la que es ────────────────────────────
 * Todos los TLDs de acá están en el bootstrap RDAP de IANA
 * (https://data.iana.org/rdap/dns.json, verificado). No es un detalle
 * cosmético: `.io`, `.co` y `.me` NO están en el bootstrap, y por la regla de
 * este servicio un TLD sin RDAP cae siempre en `unknown` -> `available: false`.
 * Sugerir `.io` sería quemar una consulta RDAP en algo que, por construcción,
 * nunca va a poder mostrarse como disponible. Por eso las tres quedan afuera
 * de las sugerencias aunque sigan estando en la búsqueda principal.
 *
 * ── Por qué los guiones son un caso chico ─────────────────────────────────
 * El pedido menciona guiones. Insertar un guion en una posición ADIVINADA
 * ("mimarca" -> "mim-arca"? "mi-marca"?) requiere segmentar palabras, y sin
 * diccionario eso genera exactamente el ruido que había que evitar. Así que
 * sólo se producen variantes con guion cuando la frontera de palabras es un
 * DATO y no una adivinanza: cuando el usuario ya escribió un separador
 * (espacio o guion) y el sanitizador lo convirtió en `-`. En ese caso se
 * ofrecen las dos formas, con y sin guion, porque son marcas igual de
 * plausibles y el usuario ya demostró dónde corta el nombre.
 */

/** Tope de consultas RDAP que puede consumir el bloque de sugerencias. */
export const MAX_SUGGESTION_LOOKUPS = 8;

/**
 * Arriba de esto, agregarle un prefijo o sufijo al nombre deja de ser una
 * marca y pasa a ser una cadena larga: "getmimarcadediseñoindustrial.com".
 * Con nombres largos se sugieren sólo extensiones alternativas.
 */
const MAX_BASE_FOR_AFFIXES = 16;

/** Largo máximo de una etiqueta DNS. */
const MAX_LABEL_LENGTH = 63;

/**
 * Ordenados por calidad de marca, no alfabéticamente: la lista se corta por
 * presupuesto, así que el orden ES la selección.
 */
const EXTRA_TLDS = [
  '.net',
  '.org',
  '.xyz',
  '.app',
  '.dev',
  '.site',
  '.studio',
  '.agency',
  '.online',
  '.store',
  '.digital',
  '.cloud',
  '.design',
  '.page',
  '.space',
  '.live',
  '.works',
  '.group',
];

/**
 * Prefijos: la mitad son el patrón SaaS internacional (get/try/go) y la otra
 * mitad es castellano rioplatense, que es el mercado del producto (mi/soy/hola).
 */
const PREFIXES = ['get', 'mi', 'soy', 'hola', 'try', 'go'];

/** Sufijos que leen como nombre de empresa, no como relleno. */
const SUFFIXES = ['app', 'hq', 'hub', 'labs', 'studio', 'market', 'oficial'];

/**
 * Sobre qué extensión se prueban las variantes de NOMBRE. `.com` primero
 * porque una variante en `.com` vale más que el nombre exacto en un TLD
 * exótico; `.net` como segunda opción para no depender de una sola.
 */
const VARIANT_TLDS = ['.com', '.net'];

export interface SuggestionCandidate {
  domain: string;
  extension: string;
  /** Por qué se generó. Sirve para agrupar en la UI y para depurar. */
  kind: 'tld' | 'prefix' | 'suffix' | 'hyphen';
}

function isValidLabel(label: string): boolean {
  return (
    label.length > 0 &&
    label.length <= MAX_LABEL_LENGTH &&
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)
  );
}

/**
 * Genera candidatos ORDENADOS por calidad. No consulta nada: sólo arma
 * nombres. El presupuesto de RDAP lo aplica el llamador cortando la lista.
 *
 * @param baseName  nombre ya sanitizado (minúsculas, `[a-z0-9-]`)
 * @param alreadyChecked  dominios de la búsqueda exacta, para no repetirlos
 */
export function buildSuggestionCandidates(
  baseName: string,
  alreadyChecked: Iterable<string>,
): SuggestionCandidate[] {
  const seen = new Set<string>(alreadyChecked);
  const out: SuggestionCandidate[] = [];

  const push = (label: string, extension: string, kind: SuggestionCandidate['kind']): void => {
    if (!isValidLabel(label)) return;
    const domain = `${label}${extension}`;
    if (seen.has(domain)) return;
    seen.add(domain);
    out.push({ domain, extension, kind });
  };

  // ── 1. Guiones. Primero de todo porque es la única variante de nombre que
  // no adivina nada: la frontera la puso el usuario.
  const hyphenVariants: string[] = [];
  if (baseName.includes('-')) {
    const collapsed = baseName.replace(/-/g, '');
    if (collapsed !== baseName) hyphenVariants.push(collapsed);
  }
  for (const variant of hyphenVariants) {
    for (const tld of VARIANT_TLDS) push(variant, tld, 'hyphen');
  }

  // ── 2. El nombre EXACTO en otras extensiones. Es lo mejor que se puede
  // ofrecer: la marca queda intacta y sólo cambia el TLD.
  const tldCandidates: SuggestionCandidate[] = [];
  for (const tld of EXTRA_TLDS) {
    const domain = `${baseName}${tld}`;
    if (seen.has(domain) || !isValidLabel(baseName)) continue;
    seen.add(domain);
    tldCandidates.push({ domain, extension: tld, kind: 'tld' });
  }

  // ── 3. Variantes de nombre sobre .com / .net.
  const affixCandidates: SuggestionCandidate[] = [];
  if (baseName.length <= MAX_BASE_FOR_AFFIXES) {
    const collect = (label: string, kind: SuggestionCandidate['kind']): void => {
      for (const tld of VARIANT_TLDS) {
        if (!isValidLabel(label)) return;
        const domain = `${label}${tld}`;
        if (seen.has(domain)) continue;
        seen.add(domain);
        affixCandidates.push({ domain, extension: tld, kind });
      }
    };

    for (const suffix of SUFFIXES) {
      // "mimarcaapp.app" es ruido; "mimarcaapp.com" no. Y si el nombre ya
      // termina así, agregarlo de nuevo da "marcastudiostudio".
      if (baseName.endsWith(suffix)) continue;
      collect(`${baseName}${suffix}`, 'suffix');
    }

    for (const prefix of PREFIXES) {
      if (baseName.startsWith(prefix)) continue;
      collect(`${prefix}${baseName}`, 'prefix');
    }
  }

  // ── 4. Intercalado. Si se concatenaran las listas, el presupuesto se lo
  // comerían entero los TLDs y el usuario no vería una sola variante de
  // nombre. Alternar 2 TLDs por cada variante mantiene el sesgo hacia "misma
  // marca, otro TLD" sin dejar la otra familia en cero.
  let t = 0;
  let a = 0;
  while (t < tldCandidates.length || a < affixCandidates.length) {
    for (let i = 0; i < 2 && t < tldCandidates.length; i += 1, t += 1) {
      out.push(tldCandidates[t]);
    }
    if (a < affixCandidates.length) {
      out.push(affixCandidates[a]);
      a += 1;
    }
  }

  return out;
}
