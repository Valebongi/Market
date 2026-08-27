#!/usr/bin/env node
/**
 * Carga del catalogo real por API. Idempotente.
 * =============================================================================
 *
 * POR QUE POR API Y NO POR SQL
 * -------------------------------------------------------------------------
 * No hay acceso SQL a la base de produccion, y no lo vamos a habilitar: abrir un
 * proxy TCP contra el Postgres de Railway es exponer la base a internet.
 *
 * Pero aun con acceso SQL, este seria el camino correcto. Entrando por
 * `POST /assets` cada activo pasa por el `CreateAssetDto`, por el ValidationPipe
 * con `whitelist` + `forbidNonWhitelisted`, por la generacion de slug con
 * resolucion de colisiones y por la regla de titularidad. Un INSERT directo se
 * saltea todo eso y puede dejar en la base filas que la propia API habria
 * rechazado. Si un activo del catalogo no pasa la validacion, el que esta mal es
 * el catalogo.
 *
 * IDEMPOTENCIA
 * -------------------------------------------------------------------------
 * Antes de escribir nada, el script lee `GET /assets/manage/list` con el token
 * del titular. Esa ruta devuelve los activos del usuario EN CUALQUIER ESTADO
 * (borrador incluido), porque el servicio pisa el `ownerId` con el `sub` del
 * token. Con eso arma el indice de lo que ya existe y saltea lo que ya cargo.
 *
 * La clave de deduplicacion es el TITULO normalizado, no el slug. El slug lo
 * deriva el servidor (`slug.util.ts`) y le agrega sufijos ante colision, asi que
 * replicarlo aca seria mantener dos veces la misma logica y desincronizarla en
 * el primer cambio. El titulo es el dato que controlamos nosotros.
 *
 * Consecuencia a tener presente: si EDITAS el titulo de un activo en
 * `catalog.data.mjs` despues de haberlo cargado, la segunda corrida lo ve como
 * un activo nuevo y crea un duplicado. Para cambiar el titulo de algo ya
 * publicado se usa `PUT /assets/:id` (y ojo: el slug no se regenera, es la URL
 * publica y es inmutable a proposito).
 *
 * Una corrida interrumpida a la mitad se retoma sola: los ya creados se saltean
 * y, con `--publish`, los que quedaron en borrador se publican.
 *
 * USO
 * -------------------------------------------------------------------------
 *   # 1. Revisar el contenido sin tocar nada y sin necesidad de token
 *   node scripts/load-catalog.mjs --dry-run
 *
 *   # 2. Ensayo local completo contra el assets-service en el puerto 3002
 *   DAVINCI_USER_ID=<uuid> node scripts/load-catalog.mjs \
 *       --api http://localhost:3002/api/v1 --direct --publish
 *
 *   # 3. Produccion, via gateway, con el token del titular
 *   DAVINCI_TOKEN=<jwt> node scripts/load-catalog.mjs \
 *       --api https://<gateway>/api/v1 --publish --yes
 *
 * El token va por VARIABLE DE ENTORNO y no por argumento: los argumentos quedan
 * en el historial del shell y son visibles en la lista de procesos de la maquina.
 *
 * `--yes` es obligatorio cuando el destino no es localhost. Es el freno de mano:
 * ninguna corrida escribe en produccion por accidente ni por autocompletado.
 *
 * SIN DEPENDENCIAS: `fetch` nativo de Node 18+ (el repo fija Node 20 en .nvmrc).
 * No agrega nada a package.json.
 */

import { CATALOG } from './catalog.data.mjs';

// ── Espejo del CreateAssetDto ──────────────────────────────────────────────
// Validamos localmente con las MISMAS reglas que el DTO para fallar en el
// escritorio y no a mitad de una carga en produccion. El servidor sigue siendo
// la autoridad: esto es un adelanto del veredicto, no un reemplazo.
// Fuente: src/modules/assets/dto/create-asset.dto.ts
const CATEGORIAS = ['software', 'design', 'business_model', 'content', 'brand', 'project', 'other'];
const LICENCIAS = ['exclusive', 'non_exclusive', 'temporary'];
const PRECIOS = ['fixed', 'negotiable', 'free'];
const TITULO_MIN = 5;
const TITULO_MAX = 120;
const DESC_MIN = 50;
const DESC_MAX = 5000;

/**
 * Campos que el DTO NO acepta. Mandar cualquiera de estos devuelve 400 por
 * `forbidNonWhitelisted`, pero la validacion local existe para que el motivo
 * quede escrito: `viewCount` y `requestCount` son prueba social y no se siembran.
 */
const PROHIBIDOS = ['viewCount', 'requestCount', 'status', 'slug', 'ownerId', 'publishedAt', 'id'];

/**
 * Recorte con el que el frontend arma la meta description del detalle
 * (`generateMetadata` en app/(public)/assets/[id]/page.tsx). Es un `slice` seco:
 * sin puntos suspensivos y sin respetar la palabra. Ese texto es el snippet de
 * Google, asi que los primeros 155 caracteres tienen que cerrar solos.
 */
const META_DESCRIPTION_CHARS = 155;

/** Campos de revision del catalogo: no viajan al servidor. */
const METADATOS_REVISION = ['_cambios', '_confirmar'];

// ── Argumentos ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    api: 'http://localhost:3002/api/v1',
    direct: false,
    dryRun: false,
    publish: false,
    yes: false,
    delay: 800,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--api') args.api = argv[++i];
    else if (a === '--direct') args.direct = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--publish') args.publish = true;
    else if (a === '--yes') args.yes = true;
    else if (a === '--delay') args.delay = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Argumento desconocido: ${a}`);
  }

  args.api = (args.api || '').replace(/\/+$/, '');
  return args;
}

function esLocal(apiUrl) {
  try {
    const { hostname } = new URL(apiUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

// ── Validacion del catalogo ────────────────────────────────────────────────

function validarCatalogo(catalogo) {
  const errores = [];
  const avisos = [];
  const titulosVistos = new Map();

  catalogo.forEach((asset, i) => {
    const ref = `[${i}] ${asset.title ?? '(sin titulo)'}`;
    const err = (msg) => errores.push(`${ref}: ${msg}`);

    for (const campo of PROHIBIDOS) {
      if (campo in asset) {
        err(`el campo "${campo}" no lo acepta CreateAssetDto y el servidor devolveria 400`);
      }
    }

    const t = (asset.title ?? '').trim();
    if (t.length < TITULO_MIN || t.length > TITULO_MAX) {
      err(`titulo de ${t.length} caracteres, fuera del rango ${TITULO_MIN}-${TITULO_MAX}`);
    }
    const clave = normalizarTitulo(t);
    if (titulosVistos.has(clave)) {
      err(`titulo duplicado dentro del catalogo (choca con el indice ${titulosVistos.get(clave)})`);
    }
    titulosVistos.set(clave, i);

    const d = (asset.description ?? '').trim();
    if (d.length < DESC_MIN || d.length > DESC_MAX) {
      err(`descripcion de ${d.length} caracteres, fuera del rango ${DESC_MIN}-${DESC_MAX}`);
    }

    // El snippet de Google. No es un error duro, pero si el recorte parte una
    // palabra por la mitad hay que reescribir la primera frase.
    if (d.length > META_DESCRIPTION_CHARS) {
      const recorte = d.slice(0, META_DESCRIPTION_CHARS);
      const siguiente = d.charAt(META_DESCRIPTION_CHARS);
      if (siguiente && !/\s/.test(siguiente) && !/\s$/.test(recorte)) {
        avisos.push(
          `${ref}: la meta description corta una palabra por la mitad -> "…${recorte.slice(-32)}"`,
        );
      }
    }

    if (!CATEGORIAS.includes(asset.category)) err(`category invalida: ${asset.category}`);
    if (!LICENCIAS.includes(asset.licenseType)) err(`licenseType invalido: ${asset.licenseType}`);
    if (!PRECIOS.includes(asset.pricingType)) err(`pricingType invalido: ${asset.pricingType}`);

    if (asset.price !== undefined) {
      if (typeof asset.price !== 'number' || !Number.isFinite(asset.price) || asset.price < 0) {
        err(`price invalido: ${asset.price}`);
      } else if (Math.round(asset.price * 100) !== asset.price * 100) {
        err(`price con mas de 2 decimales: ${asset.price}`);
      }
      // `mapAsset()` en el frontend fuerza priceFixed a undefined cuando el
      // pricingType es "negotiable", y a 0 cuando es "free": el numero guardado
      // no se muestra nunca. Guardarlo igual es dato muerto que confunde.
      if (asset.pricingType !== 'fixed') {
        avisos.push(`${ref}: tiene price pero pricingType es "${asset.pricingType}"; el frontend no lo va a mostrar`);
      }
    } else if (asset.pricingType === 'fixed') {
      err('pricingType "fixed" sin price');
    }

    for (const campo of ['allowedUses', 'restrictions', 'tags']) {
      const v = asset[campo];
      if (v !== undefined && (!Array.isArray(v) || v.some((x) => typeof x !== 'string'))) {
        err(`${campo} tiene que ser un array de strings`);
      }
    }

    if (asset.links !== undefined) {
      if (!Array.isArray(asset.links)) err('links tiene que ser un array');
      else {
        asset.links.forEach((l, j) => {
          if (!l || typeof l.label !== 'string' || typeof l.url !== 'string') {
            err(`links[${j}] necesita label y url string`);
          }
        });
      }
    }
  });

  return { errores, avisos };
}

/**
 * Clave de deduplicacion. NFC + minusculas + espacios colapsados: alcanza para
 * que un espacio de mas o una diferencia de normalizacion Unicode no genere un
 * duplicado, y no tanto como para fusionar dos activos que de verdad son
 * distintos.
 */
function normalizarTitulo(t) {
  return (t ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── Cliente HTTP ───────────────────────────────────────────────────────────

class Api {
  constructor({ base, token, userId, direct }) {
    this.base = base;
    this.token = token;
    this.userId = userId;
    this.direct = direct;
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.direct) {
      // Modo local: se le habla directo al assets-service, que confia en los
      // headers de identidad porque normalmente se los inyecta el gateway.
      //
      // Esto NO es un agujero para produccion: el gateway BORRA los x-user-*
      // que manda el cliente antes de enrutar (identityHeaderScrubber en
      // gateway/src/main.ts), y el assets-service de produccion ya no tiene
      // dominio publico. `--direct` solo puede llegar a un servicio local, y el
      // script ademas lo exige explicitamente.
      h['x-user-id'] = this.userId;
      h['x-user-role'] = 'asset_owner';
    } else {
      h.Authorization = `Bearer ${this.token}`;
    }
    return h;
  }

  async request(method, path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const texto = await res.text();
    let datos = null;
    try {
      datos = texto ? JSON.parse(texto) : null;
    } catch {
      datos = texto;
    }

    if (!res.ok) {
      const detalle = typeof datos === 'string' ? datos : JSON.stringify(datos);
      const err = new Error(`${method} ${path} -> ${res.status}: ${detalle}`);
      err.status = res.status;
      throw err;
    }
    return datos;
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `sub` del JWT, sin verificar la firma. Es solo para mostrar contra que cuenta
 * se va a escribir antes de confirmar; la autoridad sobre la identidad es el
 * gateway, que si valida el token.
 */
function subDelToken(token) {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Portadas ───────────────────────────────────────────────────────────────

/**
 * Ninguna portada se publica sin comprobar que responde. Una imagen rota en la
 * ficha es peor que no tener imagen: sin portada, `AssetCard` cae a un degrade
 * por categoria y la ficha se ve entera.
 */
async function verificarPortadas(catalogo) {
  const problemas = [];
  for (const asset of catalogo) {
    if (!asset.coverImageUrl) continue;
    try {
      const res = await fetch(asset.coverImageUrl, { method: 'HEAD', redirect: 'follow' });
      if (!res.ok) problemas.push(`${asset.title}: la portada responde ${res.status} -> ${asset.coverImageUrl}`);
    } catch (e) {
      problemas.push(`${asset.title}: la portada no es alcanzable (${e.message}) -> ${asset.coverImageUrl}`);
    }
  }
  return problemas;
}

// ── Programa ───────────────────────────────────────────────────────────────

function cuerpo(asset) {
  const body = { ...asset };
  for (const campo of METADATOS_REVISION) delete body[campo];
  return body;
}

function ayuda() {
  console.log(`
Carga del catalogo real de activos por API. Idempotente.

  --dry-run           Valida el catalogo y muestra el plan. No escribe nada ni
                      necesita token.
  --api <url>         Base de la API con prefijo. Default http://localhost:3002/api/v1
  --direct            Habla directo al assets-service con headers x-user-id en
                      vez de un JWT. Solo contra localhost (ensayo local).
  --publish           Publica lo creado (PATCH /assets/:id/publish). Sin esto
                      queda todo en borrador, invisible en el catalogo publico.
  --yes               Obligatorio si el destino no es localhost.
  --delay <ms>        Pausa entre llamadas. Default 800.

Variables de entorno:
  DAVINCI_TOKEN       JWT del titular. Requerido salvo en --direct / --dry-run.
  DAVINCI_USER_ID     UUID del titular. Requerido solo con --direct.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return ayuda();

  console.log('== Validacion del catalogo ==');
  const { errores, avisos } = validarCatalogo(CATALOG);
  for (const a of avisos) console.log(`  aviso  ${a}`);
  if (errores.length) {
    for (const e of errores) console.error(`  ERROR  ${e}`);
    console.error(`\n${errores.length} error(es). El servidor rechazaria estos activos. No se escribio nada.`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ${CATALOG.length} activo(s) validos contra CreateAssetDto.`);

  const problemasPortada = await verificarPortadas(CATALOG);
  if (problemasPortada.length) {
    for (const p of problemasPortada) console.error(`  ERROR  ${p}`);
    console.error('\nPortadas rotas. Corregilas o dejalas vacias. No se escribio nada.');
    process.exitCode = 1;
    return;
  }

  // Confirmaciones pendientes del titular: se imprimen SIEMPRE, tambien justo
  // antes de escribir en produccion.
  const pendientes = CATALOG.flatMap((a) => (a._confirmar ?? []).map((c) => `${a.title}: ${c}`));
  if (pendientes.length) {
    console.log('\n== Pendientes de confirmacion del titular ==');
    for (const p of pendientes) console.log(`  - ${p}`);
  }

  if (args.dryRun) {
    console.log('\n== Plan (--dry-run, no se escribe nada) ==');
    for (const a of CATALOG) {
      const precio = a.pricingType === 'fixed' ? `${a.price} ${a.currency ?? 'USD'}` : a.pricingType;
      console.log(`  crear  ${a.title}  [${a.category} / ${a.licenseType} / ${precio}]`);
      console.log(`         meta: "${a.description.slice(0, META_DESCRIPTION_CHARS)}"`);
    }
    return;
  }

  // ── Destino y credenciales ──
  const local = esLocal(args.api);
  if (args.direct && !local) {
    console.error(`--direct solo se puede usar contra localhost. Destino: ${args.api}`);
    process.exitCode = 1;
    return;
  }
  if (!local && !args.yes) {
    console.error(`\nDestino NO local (${args.api}) y falta --yes. Nada escrito.`);
    console.error('Corre primero --dry-run, revisa el contenido, y recien despues agrega --yes.');
    process.exitCode = 1;
    return;
  }

  const token = process.env.DAVINCI_TOKEN;
  const userId = process.env.DAVINCI_USER_ID;
  if (args.direct && !userId) {
    console.error('Falta DAVINCI_USER_ID (requerido con --direct).');
    process.exitCode = 1;
    return;
  }
  if (!args.direct && !token) {
    console.error('Falta DAVINCI_TOKEN. El token va por variable de entorno, nunca por argumento.');
    process.exitCode = 1;
    return;
  }

  const api = new Api({ base: args.api, token, userId, direct: args.direct });

  const identidad = args.direct ? { sub: userId } : subDelToken(token);
  console.log(`\n== Destino ==`);
  console.log(`  API      ${args.api}`);
  console.log(`  Modo     ${args.direct ? 'directo (x-user-id)' : 'gateway (JWT)'}`);
  console.log(`  Titular  ${identidad?.sub ?? '(desconocido)'}${identidad?.email ? ` <${identidad.email}>` : ''}`);
  console.log(`  Publicar ${args.publish ? 'si' : 'no (quedan en borrador)'}`);

  if (identidad?.sub && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identidad.sub)) {
    console.warn(`  AVISO    "${identidad.sub}" no es un UUID valido. Los activos quedarian sin titular resoluble.`);
  }

  // ── Estado actual ──
  const existentes = await api.request('GET', '/assets/manage/list?limit=100&page=1');
  const filas = existentes?.data ?? [];
  if ((existentes?.total ?? 0) > filas.length) {
    console.warn(`  AVISO    el titular tiene ${existentes.total} activos y solo se leyo la primera pagina (${filas.length}).`);
  }
  const porTitulo = new Map(filas.map((a) => [normalizarTitulo(a.title), a]));
  console.log(`  Ya tiene ${filas.length} activo(s) cargados.`);

  // ── Carga ──
  console.log('\n== Carga ==');
  const resumen = { creados: 0, salteados: 0, publicados: 0, fallidos: 0 };

  for (const asset of CATALOG) {
    const clave = normalizarTitulo(asset.title);
    let existente = porTitulo.get(clave);

    try {
      if (existente) {
        console.log(`  saltear  ${asset.title}  (ya existe, ${existente.status})`);
        resumen.salteados++;
      } else {
        const creado = await api.request('POST', '/assets', cuerpo(asset));
        console.log(`  crear    ${asset.title}  -> ${creado.id}  /${creado.slug}`);
        resumen.creados++;
        existente = creado;
        await dormir(args.delay);
      }

      // Publicar tambien lo que ya existia en borrador: asi una corrida cortada
      // a la mitad se completa sola en la siguiente.
      if (args.publish && existente.status !== 'published') {
        await api.request('PATCH', `/assets/${existente.id}/publish`);
        console.log(`  publicar ${asset.title}`);
        resumen.publicados++;
        await dormir(args.delay);
      }
    } catch (e) {
      console.error(`  FALLO    ${asset.title}: ${e.message}`);
      resumen.fallidos++;
    }
  }

  console.log(
    `\n== Resumen ==\n  creados ${resumen.creados} · salteados ${resumen.salteados} · publicados ${resumen.publicados} · fallidos ${resumen.fallidos}`,
  );
  if (resumen.fallidos) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
