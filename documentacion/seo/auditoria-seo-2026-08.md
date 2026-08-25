# Auditoría SEO y estrategia de crecimiento orgánico
**Da Vinci Inventa — `https://vinciinventa.com`**
Fecha de medición: 25 de agosto de 2026 · Agente: `seo-growth`

---

## 0. Veredicto en una página

El sitio está **técnicamente limpio pero comercialmente invisible**. La higiene
básica (robots, canonicals, HTTPS, HSTS, noindex del dashboard, bundle liviano)
está resuelta. Lo que no existe es lo que genera tráfico: **contenido indexable,
URLs que un buscador pueda descubrir, y medición.**

Tres hechos medidos que definen todo el plan:

| Hecho | Medición | Consecuencia |
|---|---|---|
| El catálogo está vacío | `/assets` sirve `0 activos encontrados` en el HTML | No hay nada que indexar |
| El catálogo no es rastreable ni cuando se llene | `/assets` es `"use client"`, filtra por `useState`, **0 enlaces a categorías o activos en el HTML** | Google no puede descubrir el inventario aunque exista |
| No hay medición | **0 tags de analytics, 0 verificación de Search Console** en el HTML de producción | El programa de SEO corre a ciegas |

Total de páginas indexables hoy: **4** (`/`, `/assets`, `/terms`, `/privacy`).
De esas, dos son legales y una está vacía. La superficie real de captación es
**una sola página**, la home, con **152 palabras** contando navbar y footer.

**No hay ningún ajuste técnico que produzca tráfico orgánico sobre esta base.**
El trabajo de las próximas semanas es construir la superficie indexable, no
afinar la que hay.

---

## 1. La restricción central: 0 activos publicados

Un marketplace rankea porque tiene inventario. Cada activo publicado es una URL
con texto único que compite por long tail ("licencia de app de delivery",
"marca de indumentaria en venta Argentina"). Con 0 activos hay **0 URLs de long
tail**, y el long tail es el 100% del tráfico realista de un dominio nuevo sin
autoridad.

### Lo que esto descarta

- No se puede rankear por términos de catálogo ("comprar licencia de software").
- No tiene sentido construir las 7 landings de categoría todavía: siete páginas
  con un titular y cero resultados son **thin content** y, apuntando todas a la
  misma acción de registro, se parecen mucho a **doorway pages**. Google las
  trata mal y además contradice el posicionamiento de confianza del producto.

### Lo que sí se puede hacer con 0 activos

Dos frentes que no dependen del inventario:

1. **Preparar la arquitectura** para que el activo número 1 capture long tail el
   mismo día que se publica. Hoy no lo haría: aunque publicaras 200 activos esta
   tarde, `/assets` seguiría entregando un HTML sin un solo enlace a ellos.
2. **Capturar la demanda del lado titular**, que es informacional y **no
   necesita catálogo**. "Cómo licenciar mi marca", "cómo monetizar un software
   que ya no uso", "qué es una licencia no exclusiva". Ese contenido se puede
   escribir hoy, rankea con autoridad baja porque la competencia en español es
   floja, y además **alimenta el inventario**: quien busca cómo licenciar su
   marca es exactamente quien tiene que publicar el primer activo.

El lado titular es el único motor de crecimiento disponible en fase 0, y
resuelve la restricción en vez de esperarla. Ese es el eje de la estrategia.

---

## 2. Auditoría técnica medida

Metodología: peticiones reales a producción el 25/08/2026 con `curl` y
`User-Agent` de Googlebot, más lectura del código fuente. Todo lo que sigue es
reproducible.

### 2.1 Indexabilidad — correcto

| Comprobación | Resultado |
|---|---|
| `robots.txt` | Correcto. Dominio real, `Disallow` de `/dashboard/`, `/api/`, `/oauth-success`, sitemap declarado |
| `sitemap.xml` | 4 URLs, todas 200, sin `noindex`. Sin errores |
| `http://` a `https://` | `301` a `https://vinciinventa.com/` |
| HSTS | `max-age=31536000; includeSubDomains; preload` |
| `/dashboard` | `X-Robots-Tag: noindex, nofollow` confirmado en cabecera |
| `canonical` en las 4 públicas | Correcto y autorreferencial en cada una |
| `/login`, `/register` | `noindex, nofollow` y fuera del sitemap. Bien resuelto |
| Compresión | `gzip` (no Brotli) |

### 2.2 Los cuatro defectos de indexabilidad que sí importan

**a) `www.vinciinventa.com` no resuelve — `NXDOMAIN`.**
Cualquier enlace entrante que alguien escriba con `www` (y la gente lo escribe)
muere. No es un problema de canonical, es DNS: no existe el registro. Se pierde
el enlace y el visitante.

**b) `alternates.canonical: SITE_URL` está declarado en el root layout.**
`frontend/app/layout.tsx`. Hoy las cuatro páginas públicas lo sobreescriben, así
que no hace daño — lo verifiqué en el HTML servido. Pero es una mina: **la
próxima página pública que se cree sin `alternates.canonical` propio se
autocanonicalizará a la home y no se indexará nunca.** Y el plan de este informe
consiste precisamente en crear páginas públicas nuevas. Hay que sacarlo antes de
empezar, no después de perder tres landings.

**c) El fallback de dominio en el root layout es el dominio equivocado.**

```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://davinci-inventa.com";
```

`robots.ts` y `sitemap.ts` usan `https://vinciinventa.com` como fallback; el root
layout usa otro dominio. Hoy no se nota porque la variable está seteada en
producción, pero un build sin la variable emite `metadataBase`, canonicals y
Open Graph apuntando a un dominio ajeno. Es un fallo silencioso y caro.

**d) `findOne` del backend no filtra por `status`.**
`backend/assets-service/src/modules/assets/assets.service.ts`:

```ts
async findOne(id: string) {
  const asset = await this.prisma.asset.findFirst({
    where: { id, deletedAt: null },   // <-- sin status
```

`findBySlug` sí filtra `status: 'published'`. Consecuencia: `/assets/<uuid>` de
un **borrador o un archivado** renderiza públicamente, con `index, follow`. Es
una fuga de contenido no publicado antes que un problema de SEO, pero también es
un problema de SEO: si un borrador se enlaza o se comparte, se indexa.

### 2.3 El problema estructural: el catálogo no es rastreable

Este es el hallazgo central de la auditoría técnica.

`frontend/app/(public)/assets/page.tsx` es `"use client"`. El catálogo se pide
en un `useEffect`, y los filtros viven en `useState`. Medido sobre el HTML real
que recibe Googlebot:

```
/assets  -> 120 palabras · 13 enlaces · 0 JSON-LD
            0 enlaces a activos · 0 enlaces a categorías
            texto servido: "0 activos encontrados"
```

Tres consecuencias, en orden de gravedad:

1. **El HTML inicial dice siempre "0 activos", tenga el catálogo lo que tenga.**
   `useEffect` no corre en SSR. Google renderiza JavaScript, sí, pero en una
   segunda pasada diferida y sin garantías. Apoyar el descubrimiento de todo el
   catálogo en esa segunda pasada es una decisión de riesgo que no hace falta
   tomar.

2. **No existe una sola URL de categoría rastreable.** Los chips de la home y
   los filtros de `/assets` son `<button>` con `onClick`, no `<Link>`. Google no
   hace clic. La faceta más obvia del negocio — las 7 categorías — es invisible.

3. **Los enlaces con querystring que sí existen no hacen nada.** No hay
   `useSearchParams` en ninguna página pública (verificado por grep). Sin
   embargo:
   - el detalle de activo enlaza etiquetas a `/assets?search=<tag>`
   - la home enlaza "Ver todos" a `/assets?ownerId=aa000000-...-digitalaxios1`

   Ambos aterrizan en el catálogo **sin filtrar**. Son enlaces rotos que no
   parecen rotos.

### 2.4 Enlazado interno: 3 de 16 enlaces de la home están rotos

Inventario completo de los 16 enlaces del HTML de la home:

| Enlace | Estado |
|---|---|
| `/help` — "Centro de Ayuda", en el footer de **todas** las páginas | **404 confirmado** |
| `/#como-funciona` — en navbar y footer de **todas** las páginas | **El ancla no existe.** El único `id` de la home es `main-content` |
| `/dashboard/domains` — "Buscar Dominios", footer de todas las páginas | Apunta a una ruta **`Disallow`** en robots.txt, y para un anónimo es un rebote a login |
| `/assets?ownerId=aa000000-...` | Filtro que la página no lee |
| Resto (`/`, `/assets`, `/terms`, `/privacy`, `/login`, `/register`) | Correctos |

Además, **el footer y el navbar mandan "Explorar Activos" a destinos distintos**:
el navbar a `/assets`, el footer a `/`. Lo cual expone el problema de fondo:

**`/` y `/assets` son funcionalmente la misma página.** La home
(`LandingMarketplace.tsx`) es un catálogo con buscador, chips de categoría,
orden y paginación. `/assets` es el mismo catálogo con los filtros en una barra
lateral. Dos URLs compitiendo por la misma intención, y ninguna de las dos hace
lo que una home debería hacer: explicar el producto a los dos lados del mercado.

### 2.5 Contenido y jerarquía de headings

```
/          152 palabras (incl. chrome; ~60 propias)
           H1 Activos intelectuales listos para licenciar
           H2 Nuestros Productos
           H4 Producto · H4 Soporte        <- footer

/assets    120 palabras
           H1 Explorá Activos Disponibles
           H3 Categorías · H3 Tipo de Licencia   <- salta el H2
           H4 Producto · H4 Soporte

/terms     H1 + 10 H2 numerados — correcto
/privacy   H1 + 10 H2 numerados — correcto
```

Un H1 por página, bien. Pero **la home tiene un solo H2 de contenido y dice
"Nuestros Productos"** — un rótulo genérico que no comunica nada ni a un usuario
ni a un buscador. `/assets` salta de H1 a H3, y sus H3 son rótulos de widgets de
filtro, no estructura de contenido.

Con 60 palabras propias, **la home no puede rankear por nada** salvo búsquedas
de marca. Las páginas con más texto sustantivo del sitio son los términos y la
política de privacidad, que no captan a nadie.

### 2.6 Datos estructurados

| Página | JSON-LD |
|---|---|
| `/` | `Organization` + `WebSite` con `SearchAction`. Bien formado |
| `/assets` | **Ninguno** |
| `/assets/[id]` | `Product` + `Offer`. Correcto y honesto |
| `/terms`, `/privacy` | Ninguno (no hace falta) |

**El markup del detalle de activo está bien resuelto y no hay que tocarlo.**
Declara `Product` sin `seller`, sin `brand` y sin `availability: InStock`, con el
precio como precio pedido por el titular. Es exactamente lo que la plataforma
hace y nada más. Confirmo la decisión: **no reponer esos campos.**

Dos defectos:

- **`/assets` no tiene ningún dato estructurado.** Cuando haya catálogo, le
  corresponde un `CollectionPage` con `ItemList`.
- **El `SearchAction` de la home es una declaración falsa.** Apunta a
  `${SITE_URL}/?search={search_term_string}`, pero la home **no lee
  `searchParams`**. Google puede intentar usarla para la caja de búsqueda de
  sitelinks y no funciona. No es una penalización, pero es markup que afirma una
  capacidad inexistente — el mismo criterio por el que se sacaron `seller` y
  `availability`. O se hace funcionar el parámetro, o se saca el `SearchAction`.

### 2.7 Metadatos, Open Graph y compartición

Títulos y descripciones: correctos, únicos, sin duplicación de marca (el fix de
hoy funcionó — verificado en el HTML servido).

Tres defectos de Open Graph, todos con impacto en CTR social, ninguno en ranking:

**a) `og:image` ausente en `/assets`, `/terms` y `/privacy`.**
Esas páginas definen su propio bloque `openGraph` sin `images`, y Next **no
hereda** el `images` del root cuando el hijo declara `openGraph`. Resultado:
compartir `/assets` en WhatsApp o LinkedIn produce una tarjeta sin imagen.

**b) La imagen OG es un logo cuadrado de 512×512 servido como
`summary_large_image`.** Esa tarjeta espera ~1200×630 (ratio 2:1). Un cuadrado
se recorta o se degrada a tarjeta chica. Hace falta una OG image dedicada.

**c) `twitter:title` en `/terms` y `/privacy` dice "Da Vinci Inventa –
Marketplace de Licencias"** mientras el `og:title` dice el título real de la
página. Herencia parcial inconsistente. Cosmético.

También: `meta keywords` está presente en todas las páginas. Google la ignora
desde 2009. No hace daño; es ruido. Sacarla cuando se toque el archivo, no antes.

### 2.8 Rendimiento y Core Web Vitals

Medido con `curl` desde el cliente, 25/08/2026:

| Métrica | `/` | `/assets` |
|---|---|---|
| TTFB | **900 ms** | 726 ms |
| Total | 1.19 s | 0.96 s |
| HTML (gzip) | 67.6 KB | 45.0 KB |

No tengo datos de campo (CrUX) porque el sitio no tiene tráfico ni analytics.
Lo que sigue es análisis de laboratorio y de código.

**Lo que está bien y no hay que tocar:**

- 106 KB de First Load JS compartido, rutas de 107 a 135 kB. Es un bundle sano.
- Fuentes vía `next/font` con `display: swap` y preload. Correcto, sin CLS de fuentes.
- `Cache-Control: immutable` en `/_next/static/*`. Correcto.
- El logo del navbar se sirve por `next/image` a 48×48 (96w servido). Correcto.

**Los dos problemas reales:**

**a) El root layout precarga el logo crudo de 174 KB en todas las páginas.**
`frontend/app/layout.tsx`:

```html
<link rel="preload" href="/Logo DaVinci.png" as="image" />
```

Medido: `/Logo DaVinci.png` pesa **174.180 bytes**. Y `next/image` **ya emite su
propio preload** de la versión optimizada de 96w — lo verifiqué en el HTML:

```html
<link rel="preload" as="image" imageSrcSet="/_next/image?url=%2FLogo%20DaVinci.png&w=48&q=75 1x, ...&w=96&q=75 2x"/>
<link rel="preload" href="/Logo DaVinci.png" as="image"/>   <!-- 174 KB, nunca se usa -->
```

El preload manual descarga **174 KB en la ruta crítica de cada página para
mostrar una imagen de 48 píxeles que ya viene por otro lado**, compitiendo por
ancho de banda con el LCP real. El comentario del código dice que "refuerza en
SSR"; en los hechos duplica y estorba. Borrar esa línea es la mejor relación
esfuerzo/beneficio de rendimiento del sitio entero.

**b) Cloudflare está en DNS-only: no hay CDN.**
El sitio se sirve desde Railway, edge `mia1` (Miami). Cada visitante de Buenos
Aires, Bogotá o Ciudad de México cruza el continente para el HTML. Con 900 ms de
TTFB, el LCP arranca con casi un segundo gastado antes del primer byte útil.
Para un sitio con foco LATAM esto es el techo de rendimiento, y no se rompe
optimizando JavaScript.

Nota: la home responde con `Cache-Control: s-maxage=31536000` y
`x-nextjs-cache: HIT` — está prerenderizada con caché de un año. Si se activa un
CDN por delante, ese `s-maxage` hay que revisarlo o el contenido queda congelado.

### 2.9 Medición: no existe

Grep sobre el HTML de producción buscando `google-site-verification`, `gtag`,
`googletagmanager`, `analytics`, `plausible`, `umami`, `posthog`, `clarity`:
**cero coincidencias.**

No hay analítica y no hay verificación de Search Console en el HTML. Sin Search
Console no se sabe qué se indexó, qué consultas aparecen, ni qué errores de
rastreo hay. **Es el primer bloqueo a resolver, antes que cualquier otra cosa de
esta lista**, porque sin él ninguna de las fases siguientes se puede evaluar.

---

## 3. La oportunidad de los slugs

### Qué hay construido

`backend/assets-service`:

- `Asset.slug` es `String @unique` en el schema Prisma.
- Se genera en `create()` a partir del título.
- `GET /assets/slug/:slug` existe en el controller y está en la lista de rutas
  públicas del gateway (`app.module.ts` línea 41).
- `findBySlug` filtra `status: 'published'` — **más seguro que `findOne`**, que
  no filtra nada.

`frontend`: no lo usa. Rutea por `/assets/[id]` con UUID.

Es infraestructura completa, funcionando, y sin explotar.

### Cuánto vale realmente

Seamos precisos, porque acá se exagera mucho: **la palabra clave en la URL es un
factor de ranking débil.** Migrar a slugs no va a mover posiciones por sí solo.

Lo que sí vale:

1. **CTR.** `vinciinventa.com/assets/licencia-app-delivery-multivendor` en un
   resultado de búsqueda o pegado en WhatsApp comunica; un UUID no comunica nada
   y parece un enlace sospechoso. En un producto cuyo posicionamiento es la
   confianza, eso no es un detalle.
2. **Enlaces entrantes con texto de ancla útil.** Quien copia una URL semántica
   la pega tal cual; el texto de la URL funciona como ancla.
3. **Coherencia de taxonomía.** Sin slugs no se puede construir
   `/assets/categoria/software/...` de forma consistente.

### Por qué hay que hacerlo ahora y no después

**El costo de migración es exactamente cero, hoy, y solo hoy.**

Con 0 activos publicados no hay ni una URL indexada que redirigir, ni una señal
de enlace que preservar, ni un mapa de 301 que mantener. Cuando haya 500 activos
indexados, la misma migración es un proyecto con tabla de redirecciones,
ventana de reindexación y pérdida temporal de posiciones.

**Es la decisión más barata del informe y su ventana se cierra con el primer
activo publicado.** Recomendación: hacerlo antes de que se publique el activo
número uno.

### Lo que hay que arreglar como parte de la migración

**1. `slugify()` destruye acentos y la ñ.**

```ts
function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')   // \w es [A-Za-z0-9_]: elimina á é í ó ú ñ ü
```

`"Diseño Único"` produce `diseo-nico`. En un marketplace hispanohablante donde
los títulos van a estar llenos de "Diseño", "Gestión", "Logística", "Español",
esto rompe URLs sistemáticamente. Corrección estándar:
`text.normalize('NFD').replace(/[̀-ͯ]/g, '')` antes del filtro, más un
reemplazo explícito de `ñ` a `n`. Sin esto, la migración empeora las URLs en vez
de mejorarlas.

**2. La colisión resuelve con `-${Date.now()}`.**
`mi-marca-1787654321098` — 13 dígitos pegados al slug. Feo y frágil. Un sufijo
incremental (`mi-marca-2`) es más limpio.

**3. El slug no se regenera al editar el título.**
`update()` no toca el slug. Es **la decisión correcta para SEO** — un slug que
cambia rompe las URLs compartidas e indexadas — pero hoy es un accidente, no una
política. Debe quedar documentado como intencional: **el slug es inmutable
después de publicar.**

**4. `viewCount` se incrementa en cada GET anónimo, incluido Googlebot.**
Se muestra como prueba social ("N vistas") en el detalle. Cuando Google rastree
el catálogo, va a inflar el contador de cada activo y además va a escribir en la
base de datos una vez por rastreo. Métrica contaminada y escritura innecesaria.
No bloquea la migración, pero conviene resolverlo junto con ella.

### Forma de URL recomendada

```
/assets/[slug]                     detalle
/assets/categoria/[categoria]      landing de categoría (7)
/assets?page=N                     paginación rastreable
```

Sobre traducir el segmento `/assets` a `/activos`: el impacto en ranking es
**marginal**, y no lo vendo como una victoria. Es coherencia de producto para un
sitio en español. Si se decide, ahora cuesta un `301` sobre una única URL;
después cuesta más. Lo dejo como opcional, agrupado con la migración de slugs, y
sin prioridad propia.

---

## 4. Arquitectura de información propuesta

### El problema a resolver

Hoy `/` y `/assets` son la misma cosa, y ninguna cumple su función. Un
marketplace de dos lados necesita una home que hable a los dos lados y un
catálogo separado.

### Mapa de URLs objetivo

| URL | Función | Intención | Depende de inventario |
|---|---|---|---|
| `/` | Home real: qué es, para quién, cómo funciona, dos caminos | Marca + navegacional | **No** |
| `/publicar` | Landing del titular: monetizá lo que ya tenés | Comercial, lado oferta | **No** |
| `/como-funciona` | Página real (hoy es un ancla que no existe) | Informacional | **No** |
| `/ayuda` | Centro de ayuda (hoy 404 desde todos los footers) | Soporte | **No** |
| `/guias/[slug]` | Hub de contenido | Informacional | **No** |
| `/assets` | Catálogo SSR, paginado, con enlaces reales | Comercial, lado demanda | Sí |
| `/assets/categoria/[categoria]` | 7 landings de categoría | Comercial segmentada | **Sí** |
| `/assets/[slug]` | Detalle | Long tail | **Sí** |

Las cinco primeras **no dependen del catálogo** y son las que se construyen en
fase 1. Las tres últimas se preparan ahora y se abren a indexación cuando haya
con qué llenarlas.

### Regla de indexación por umbral

Para no publicar thin content ni doorway pages, cada landing de categoría se
construye ahora pero se emite con `noindex` mientras tenga menos de un mínimo de
activos publicados. Propongo **3 activos** como umbral, y que el propio
`generateMetadata` lo decida a partir del `total` que ya devuelve la API:

```
total >= 3  ->  index, follow  + entra al sitemap
total <  3  ->  noindex, follow + fuera del sitemap
```

Esto no es un truco: es publicar una página cuando tiene contenido y no antes.
La misma regla evita el peor escenario del arranque en frío, que es que Google
rastree 7 landings vacías idénticas y concluya que el sitio es de baja calidad.

### Paginación y facetas

- `/assets?page=N` debe ser **rastreable y SSR**, con enlaces `<Link>` reales
  entre páginas. Es el camino por el que Google descubre el inventario.
- Los filtros combinados (`?category=X&licenseType=Y&sort=Z`) generan
  combinatoria infinita. **Canonical de toda combinación a la landing de
  categoría** cuando haya una, o a `/assets` cuando no. No usar `noindex` en
  facetas: canonical alcanza y conserva el rastreo.
- El orden (`sortBy`) nunca genera URL indexable distinta.

---

## 5. Estrategia de contenido por intención de búsqueda

### Advertencia metodológica, para no vender humo

**No tengo datos de volumen de búsqueda.** No hay una herramienta de keyword
research conectada al proyecto. Los clusters que siguen están construidos por
razonamiento sobre el modelo de negocio y la estructura de la demanda, no
medidos. La priorización relativa es sólida; los números absolutos no los puedo
dar y no los voy a inventar.

**Validar volumen y dificultad con una herramienta real es una decisión de
negocio (presupuesto).** Ver sección 8.

### Cluster A — Lado titular: "tengo algo, cómo lo monetizo"

**Es el cluster prioritario, y es el único que rinde en fase 0.**

Tres razones concretas:

1. **No depende del catálogo.** Es contenido informacional puro.
2. **La competencia en español es floja.** Lo que hay son estudios de abogados
   vendiendo registro de marca y blogs de propiedad intelectual académicos. No
   hay nadie hablándole a un titular que quiere monetizar un activo ocioso.
3. **Resuelve la restricción central.** Quien busca "cómo licenciar mi marca"
   es, literalmente, quien tiene que publicar el primer activo. Este contenido
   no solo trae tráfico: **trae inventario.** Es el único cluster que rompe el
   arranque en frío en vez de esperar a que se rompa solo.

Temas, en orden de prioridad:

| Tema | Intención | Por qué |
|---|---|---|
| Cómo licenciar mi marca sin venderla | Informacional a comercial | Explica el modelo y desemboca en `/publicar` |
| Licencia exclusiva vs. no exclusiva vs. temporal | Informacional | Consulta real y recurrente; conecta con el enum del producto |
| Cómo monetizar un software que ya no uso | Informacional a comercial | Nicho de baja competencia, alta afinidad |
| Cuánto cobrar por licenciar un activo intelectual | Transaccional-informacional | Alta intención, difícil de responder bien: ventaja competitiva |
| Qué se puede licenciar: marcas, software, diseños, modelos | Informacional | Página pilar del cluster |

Cada guía enlaza a `/publicar`. Ese es el embudo completo en fase 0.

**Restricción de copy no negociable:** ninguna guía puede sugerir que la
plataforma verifica titularidad, procesa pagos o firma contratos. El ángulo
correcto es "te conectamos con interesados", nunca "gestionamos tu licencia".

### Cluster B — Lado emprendedor: "quiero adquirir algo"

**Prioridad diferida. Depende íntegramente del inventario.**

La intención acá es comercial y transaccional, y quien busca "comprar marca
registrada" espera aterrizar en un listado con resultados. Mandarlo a un
catálogo vacío es quemar la impresión y el clic. Además, los head terms de este
cluster son competitivos: hay marketplaces establecidos, brokers y estudios
jurídicos con años de autoridad.

Cuando haya inventario, el tráfico de este lado va a venir del **long tail de
los propios activos** (`/assets/[slug]`), no de las cabeceras de categoría. Por
eso la arquitectura de slugs y el catálogo SSR son la inversión correcta, y no
escribir landings comerciales hoy.

Temas para cuando haya catálogo: modelos de negocio listos para usar, licencias
de software para revender, marcas disponibles para licenciar por categoría.

### Cluster C — Marca

`da vinci inventa`, `vinciinventa`. Volumen bajo hoy, pero **debe estar
blindado**: la home ya rankea acá y no hay que hacer nada salvo no romperlo.
Search Console lo va a confirmar en cuanto se instale.

### Prioridad, esfuerzo contra retorno

| Cluster | Esfuerzo | Retorno | Plazo | Depende de catálogo |
|---|---|---|---|---|
| A — Titulares | Medio (redacción) | **Alto** | 3-6 meses | No |
| C — Marca | Nulo | Bajo pero seguro | Inmediato | No |
| B — Emprendedores | Alto | Alto, diferido | 9-18 meses | **Sí** |

---

## 6. Plazos honestos

El SEO orgánico no rinde en semanas. Con un dominio nuevo, sin autoridad, sin
enlaces entrantes y sin contenido, lo realista es:

| Hito | Plazo desde el arranque | Condición |
|---|---|---|
| Indexación de las páginas nuevas | 1 a 4 semanas | Search Console instalado y sitemap enviado |
| Primeras impresiones de marca en GSC | 2 a 6 semanas | — |
| Primeros rankings de long tail informacional (cluster A) | **3 a 6 meses** | 5-8 guías publicadas y de calidad real |
| Tráfico orgánico sostenido de decenas de sesiones/mes | **6 a 9 meses** | Cluster A funcionando |
| Tráfico de cientos de sesiones/mes | **9 a 18 meses** | Cluster A + inventario real + algunos enlaces entrantes |
| Rankear por head terms comerciales | **18+ meses, o nunca sin link building** | Autoridad de dominio que hoy no existe |

Un factor que no controlo y conviene verificar: **la antigüedad del dominio**. Un
dominio recién registrado tarda más en generar confianza. No pude determinarla
con las herramientas disponibles.

Nada de esto se acelera con trucos. Se acelera con inventario y con enlaces
entrantes ganados, que son decisiones de negocio, no de código.

---

## 7. Qué NO vale la pena hacer

Esta sección importa tanto como el resto. Un plan que solo suma tareas no sirve
para priorizar.

**No construir las 7 landings de categoría con contenido indexable ahora.**
Siete páginas sin resultados, con el mismo esqueleto y la misma llamada a la
acción, son thin content y se parecen a doorway pages. Construir las rutas sí;
abrirlas a indexación solo pasando el umbral de 3 activos.

**No escribir contenido del cluster B (emprendedores) todavía.** Aterriza en un
catálogo vacío. Se quema la impresión y no se recupera el clic.

**No perseguir head terms comerciales.** "Comprar marca registrada", "licencias
de software": competencia establecida contra un dominio sin autoridad. Es gastar
esfuerzo en algo que no va a rankear en el horizonte del plan.

**No hacer más optimización de Core Web Vitals más allá de borrar el preload del
logo.** El bundle está sano (106 KB compartidos). El cuello de botella real es
el TTFB de 900 ms por falta de CDN, que no se arregla tocando JavaScript. Todo
lo demás en rendimiento es rendimiento decreciente.

**No agregar schema de `Review`, `AggregateRating` ni `FAQPage` masivo.** El MVP
**no tiene rating de usuarios** (límite duro del contexto compartido). Marcarlo
sería inventar datos, exactamente el error que ya se corrigió al sacar `seller` y
`availability`. Y el FAQ schema masivo ya casi no genera resultados enriquecidos.

**No implementar hreflang ni segmentación por país.** Un solo mercado
hispanohablante, un solo idioma, cero tráfico. Complejidad sin retorno. Revisar
recién si LATAM se abre a varios dominios o subcarpetas.

**No cambiar de dominio.** `vinciinventa.com` está bien: corto, de marca,
memorizable. Cambiarlo tira a la basura lo poco que haya acumulado.

**No comprar enlaces, no usar PBNs, no generar contenido en masa con IA para
rankear.** Riesgo de penalización, y contradice frontalmente un producto cuyo
posicionamiento es la confianza.

**No priorizar sacar `meta keywords`.** Es ruido inerte, no un problema. Se
borra cuando se toque el archivo por otra razón.

**No mover Cloudflare a modo proxy sin revisar antes el `s-maxage=31536000` de
la home.** Poner un CDN por delante de una cabecera de caché de un año congela
el sitio. El orden importa.

---

## 8. Decisiones de negocio — para el dueño del proyecto

Estas cinco no las puede tomar ningún agente. Las listo para que el orquestador
las eleve.

**1. Herramienta de keyword research (presupuesto).**
Sin datos de volumen y dificultad, la priorización de contenido es razonada pero
no medida. Ahrefs / Semrush / Mangools, o el Planificador de Palabras Clave de
Google (gratis, datos gruesos, sirve para empezar).

**2. Quién escribe el contenido del cluster A (recurso editorial).**
Son 5 a 8 guías de calidad real, con criterio jurídico y comercial. No es
contenido que se pueda generar en masa sin destruir el posicionamiento de
confianza. Hay que decidir: redacción interna, freelance especializado, o no se
hace. **Si no se hace, no hay estrategia de fase 0 y el sitio espera al
inventario sin hacer nada.** Es la decisión de mayor impacto del informe.

**3. Blog / hub de guías: ¿existe como sección del producto?**
La arquitectura propone `/guias/[slug]`. Implica un modelo de contenido, un
flujo de publicación y mantenimiento. Es una decisión de producto, no de SEO.

**4. Activar el CDN de Cloudflare (modo proxy).**
Hoy está en DNS-only y el origen está en Miami. Para foco LATAM, activar el proxy
recorta el TTFB de forma significativa. Requiere revisar el `s-maxage` y validar
que no rompa la autenticación ni el proxy del gateway. Impacto de infraestructura,
decisión de riesgo.

**5. Cómo se consigue el primer inventario.**
Es la restricción central y **no se resuelve con SEO.** El cluster A ayuda a
mediano plazo, pero los primeros 20-50 activos van a salir de captación directa,
alianzas o carga propia. Hasta que eso pase, el techo del SEO es el cluster A.

---

## 9. Plan por fases

### Fase 0 — Desbloquear la medición (semana 1)

Sin esto, nada de lo que sigue se puede evaluar.

1. Alta en Google Search Console + verificación, y envío del sitemap.
2. Analítica web instalada.
3. Crear el registro DNS `www` y redirigir 301 al ápice.

### Fase 1 — Reparar y preparar (semanas 1-3) — no depende del catálogo

4. Borrar el preload del logo de 174 KB del root layout.
5. Sacar `alternates.canonical` del root layout (mina para las páginas nuevas).
6. Corregir el fallback de dominio equivocado en el root layout.
7. Arreglar los 3 enlaces rotos del footer/navbar.
8. Filtrar por `status: 'published'` en `findOne` del backend.
9. Migrar el detalle de activo a slugs, con la corrección de acentos. **Antes de
   publicar el primer activo.**
10. Hacer `/assets` SSR con enlaces reales y paginación rastreable.
11. Crear `/como-funciona`, `/ayuda` y `/publicar` como páginas reales.
12. Diferenciar la home del catálogo.
13. OG image dedicada de 1200×630, y `og:image` en las páginas que lo perdieron.

### Fase 2 — Contenido del lado titular (semanas 3-12) — no depende del catálogo

14. Publicar 5 a 8 guías del cluster A, enlazadas a `/publicar`.
    **Bloqueado por la decisión de negocio nº 2.**

### Fase 3 — Abrir el catálogo (cuando haya inventario)

15. Landings de categoría con la regla de umbral de 3 activos.
16. `CollectionPage` + `ItemList` en el catálogo.
17. Activos en el sitemap con paginación (el `limit=200` actual no escala).
18. Contenido del cluster B.

### Fase 4 — Autoridad (mes 6 en adelante)

19. Enlaces entrantes ganados. Decisión de negocio, no de código.

---

*Informe elaborado por el agente `seo-growth`. Todas las mediciones son de
producción, 25/08/2026, y reproducibles con `curl` sobre `https://vinciinventa.com`.
Este agente no modificó ningún archivo fuera de `documentacion/seo/`.*
