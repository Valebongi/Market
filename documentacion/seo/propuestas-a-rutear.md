# Propuestas SEO para rutear a los agentes dueños

Generado por `seo-growth` el 25/08/2026. Respaldo y evidencia en
[`auditoria-seo-2026-08.md`](./auditoria-seo-2026-08.md).

`seo-growth` no implementa. Cada línea de esta tabla es una propuesta para que el
orquestador la despache al agente dueño del archivo.

**Orden de despacho recomendado: P0 antes que P1, y P1-09 (slugs) antes de que se
publique el primer activo.**

---

## P0 — Bloqueantes. Sin esto no se puede medir ni evaluar nada

### P0-01 · Verificación de Google Search Console

| | |
|---|---|
| **Archivo** | `frontend/app/layout.tsx` (`metadata.verification.google`) |
| **Agente** | `front-marketplace` |
| **Cambio** | Agregar el meta de verificación. El token lo provee el dueño del proyecto tras crear la propiedad en GSC |
| **Qué se gana** | Sin GSC no se sabe qué se indexó, qué consultas aparecen ni qué errores de rastreo hay. **Es el prerrequisito de todo el programa** |
| **Evidencia** | Grep sobre el HTML de producción: 0 coincidencias de `google-site-verification` |
| **Nota** | Requiere acción del dueño del proyecto (crear la propiedad). Alternativa: verificación por DNS TXT, que iría a `gw-infra` |

### P0-02 · Analítica web

| | |
|---|---|
| **Archivo** | `frontend/app/layout.tsx` |
| **Agente** | `front-marketplace` |
| **Cambio** | Instalar analítica (Plausible / Umami / GA4) |
| **Qué se gana** | Medir el tráfico que el plan pretende generar. Hoy no hay ninguna instrumentación |
| **Evidencia** | Grep: 0 coincidencias de `gtag`, `googletagmanager`, `plausible`, `umami`, `posthog`, `clarity` |
| **Nota** | La elección de herramienta es decisión de negocio (costo, privacidad, GDPR) |

### P0-03 · Registro DNS `www` con 301 al ápice

| | |
|---|---|
| **Archivo** | DNS de Cloudflare (no es un archivo del repo) |
| **Agente** | `gw-infra` |
| **Cambio** | Crear `www.vinciinventa.com` y redirigir 301 a `https://vinciinventa.com` |
| **Qué se gana** | Hoy `www` es **NXDOMAIN**. Todo enlace entrante o visita escrita con `www` se pierde entera |
| **Evidencia** | `nslookup www.vinciinventa.com` → `Non-existent domain` |

---

## P1 — Reparaciones y preparación. No dependen del catálogo

### P1-04 · Borrar el preload del logo de 174 KB

| | |
|---|---|
| **Archivo** | `frontend/app/layout.tsx`, bloque `<head>` |
| **Agente** | `front-marketplace` |
| **Cambio** | Eliminar `<link rel="preload" href="/Logo DaVinci.png" as="image" />` |
| **Qué se gana** | **174.180 bytes menos en la ruta crítica de cada página.** `next/image` ya emite su propio preload de la versión de 96w; el manual descarga el PNG completo que nunca se usa y compite con el LCP real |
| **Evidencia** | `curl` al PNG: 174.180 bytes. En el HTML servido conviven los dos `<link rel="preload" as="image">` |
| **Riesgo** | Ninguno. El comentario del código dice que "refuerza en SSR"; en los hechos duplica |

### P1-05 · Sacar `alternates.canonical` del root layout

| | |
|---|---|
| **Archivo** | `frontend/app/layout.tsx`, `metadata.alternates` |
| **Agente** | `front-marketplace` |
| **Cambio** | Eliminar `alternates: { canonical: SITE_URL }` del layout raíz. Cada página declara el suyo |
| **Qué se gana** | Evita que **toda página pública futura sin canonical propio se autocanonicalice a la home y no se indexe nunca**. El plan crea varias páginas nuevas, así que hay que desactivar la mina antes de empezar |
| **Evidencia** | `/login` y `/register` sirven `<link rel="canonical" href="https://vinciinventa.com"/>` — heredan el del root. Hoy son `noindex`, así que no duele; en una landing nueva sí |

### P1-06 · Corregir el fallback de dominio equivocado

| | |
|---|---|
| **Archivo** | `frontend/app/layout.tsx`, constante `SITE_URL` |
| **Agente** | `front-marketplace` |
| **Cambio** | El fallback dice `https://davinci-inventa.com`; debe decir `https://vinciinventa.com`, igual que `robots.ts` y `sitemap.ts` |
| **Qué se gana** | Un build sin `NEXT_PUBLIC_SITE_URL` emite `metadataBase`, canonicals y OG apuntando a un dominio ajeno. Fallo silencioso y caro |
| **Evidencia** | Lectura del código. En producción la variable está seteada, así que hoy no se manifiesta |

### P1-07 · Arreglar los tres enlaces rotos del footer y el navbar

| | |
|---|---|
| **Archivo** | `frontend/components/layout/Footer.tsx`, `frontend/components/layout/Navbar.tsx` |
| **Agente** | `front-core` |
| **Cambio** | (a) `/help` → 404 confirmado: crear la página o quitar el enlace. (b) `/#como-funciona` → el ancla no existe en la home: crear la sección o apuntar a `/como-funciona` (ver P1-11). (c) `/dashboard/domains` en el footer público → apunta a una ruta `Disallow` y rebota a login al anónimo. (d) Unificar "Explorar Activos": el navbar va a `/assets` y el footer a `/` |
| **Qué se gana** | Son enlaces presentes en **todas** las páginas del sitio. Un 404 sitewide desde el footer es la señal de calidad más barata de arreglar |
| **Evidencia** | `curl /help` → `404`. Los únicos `id` de la home son `main-content`. Inventario de los 16 enlaces de la home en §2.4 del informe |

### P1-08 · `findOne` debe filtrar por `status: 'published'`

| | |
|---|---|
| **Archivo** | `backend/assets-service/src/modules/assets/assets.service.ts`, método `findOne` |
| **Agente** | `svc-assets` |
| **Cambio** | Agregar el filtro de estado, o exponer una variante pública que lo aplique. `findBySlug` ya lo hace |
| **Qué se gana** | Hoy `/assets/<uuid>` de un **borrador o archivado renderiza públicamente con `index, follow`**. Es una fuga de contenido no publicado antes que un problema de SEO, y también un problema de SEO |
| **Evidencia** | `where: { id, deletedAt: null }` — sin `status`. Contrastar con `findBySlug`, que sí filtra |
| **Cuidado** | El dashboard del titular necesita leer sus propios borradores. La variante pública debe ser distinta de la autenticada — coordinar con `front-dashboard` |

### P1-09 · Migrar el detalle de activo a slugs · **ventana que se cierra**

| | |
|---|---|
| **Archivos** | `frontend/app/(public)/assets/[id]/page.tsx` (renombrar a `[slug]`), `frontend/services/assets.service.ts`, `frontend/app/sitemap.ts`, `backend/assets-service/src/modules/assets/assets.service.ts` (`slugify`) |
| **Agentes** | `front-marketplace` (ruta y metadatos) + `front-core` (capa de servicios) + `svc-assets` (`slugify`) |
| **Cambio** | (a) Rutear por `/assets/[slug]` consumiendo el `GET /assets/slug/:slug` que **ya existe** en el backend y está en la lista de rutas públicas del gateway. (b) **Corregir `slugify()`**: `[^\w\s-]` borra acentos y ñ, así que "Diseño Único" produce `diseo-nico`. Normalizar con NFD antes de filtrar. (c) Reemplazar el sufijo de colisión `-${Date.now()}` por uno incremental. (d) Documentar que **el slug es inmutable después de publicar** (hoy `update()` no lo regenera, lo cual es correcto pero accidental) |
| **Qué se gana** | URLs semánticas: mejor CTR en resultados y al compartir, texto de ancla útil, y la base de la taxonomía por categoría. **Con 0 activos publicados el costo de migración es cero: no hay URLs indexadas que redirigir ni señales que preservar.** Con 500 activos indexados es un proyecto con tabla de 301 y ventana de reindexación |
| **Prioridad** | Alta **por la ventana, no por el impacto**. La palabra clave en la URL es un factor de ranking débil; lo que se compra hoy es no pagar la migración mañana |
| **Bloqueo** | **Debe hacerse antes de que se publique el primer activo** |

### P1-10 · `/assets` a SSR con enlaces reales y paginación rastreable

| | |
|---|---|
| **Archivo** | `frontend/app/(public)/assets/page.tsx` |
| **Agente** | `front-marketplace` |
| **Cambio** | Convertir a Server Component que lea `searchParams` y traiga el catálogo en el servidor. Los filtros y la paginación pasan a ser `<Link>` con querystring, no `useState`. Mantener la interactividad en un componente hijo cliente si hace falta |
| **Qué se gana** | **Es el cambio que hace descubrible el catálogo entero.** Hoy el HTML servido dice "0 activos encontrados" pase lo que pase con el inventario, y no contiene un solo enlace a un activo ni a una categoría. Sin esto, publicar activos no genera tráfico |
| **Evidencia** | El archivo es `"use client"`; el catálogo se pide en `useEffect`. HTML medido: 120 palabras, 13 enlaces, 0 a activos, 0 a categorías. No hay `useSearchParams` en ninguna página pública |
| **Efecto secundario** | Arregla los enlaces `/assets?search=<tag>` del detalle y `/assets?ownerId=...` de la home, que hoy aterrizan sin filtrar |
| **Regla** | Canonical de toda combinación de filtros a `/assets` (o a la landing de categoría cuando exista). No usar `noindex` en facetas |

### P1-11 · Crear `/como-funciona`, `/ayuda` y `/publicar`

| | |
|---|---|
| **Archivos** | `frontend/app/(public)/como-funciona/page.tsx`, `.../ayuda/page.tsx`, `.../publicar/page.tsx` + `frontend/app/sitemap.ts` |
| **Agente** | `front-marketplace` |
| **Cambio** | Tres páginas públicas reales, con metadatos y canonical propios, y alta en el sitemap |
| **Qué se gana** | Triplica la superficie indexable **sin depender del catálogo**. `/publicar` es el destino de conversión de todo el cluster de contenido del lado titular, que es la única estrategia viable en fase 0. `/como-funciona` y `/ayuda` además cierran dos de los enlaces rotos de P1-07 |
| **Restricción de copy** | Ninguna de las tres puede sugerir que la plataforma verifica titularidad, procesa pagos o firma contratos. El ángulo es "te conectamos con interesados", nunca "gestionamos tu licencia" |

### P1-12 · Diferenciar la home del catálogo

| | |
|---|---|
| **Archivos** | `frontend/app/(public)/page.tsx`, `frontend/app/(public)/_components/LandingMarketplace.tsx` |
| **Agente** | `front-marketplace` |
| **Cambio** | La home deja de ser un segundo catálogo y pasa a explicar el producto a los dos lados: qué es, para quién, cómo funciona, dos caminos (`/publicar` y `/assets`). Reemplazar el H2 "Nuestros Productos" por estructura de contenido real |
| **Qué se gana** | Hoy `/` y `/assets` son funcionalmente idénticas y compiten por la misma intención, y la home tiene **~60 palabras propias** — no puede rankear por nada salvo marca. Además da destino a los enlaces internos que hoy se contradicen |
| **Evidencia** | `LandingMarketplace.tsx` es un catálogo con buscador, chips, orden y paginación. Medición de headings y palabras en §2.5 |
| **Nota** | Toca conversión además de SEO. Coordinar con quien decida el mensaje de producto |

### P1-13 · Arreglar el `SearchAction` del JSON-LD de la home

| | |
|---|---|
| **Archivo** | `frontend/app/(public)/page.tsx`, objeto `jsonLd` |
| **Agente** | `front-marketplace` |
| **Cambio** | El `urlTemplate` apunta a `${SITE_URL}/?search={search_term_string}` y **la home no lee `searchParams`**. O se hace funcionar el parámetro (mejor: apuntarlo a `/assets?search=` una vez hecho P1-10), o se elimina el `SearchAction` |
| **Qué se gana** | Es markup que le afirma a Google una capacidad que el sitio no tiene — el mismo criterio por el que se sacaron `seller` y `availability` del `Product` |

### P1-14 · Open Graph: imagen dedicada y herencia rota

| | |
|---|---|
| **Archivos** | `frontend/app/(public)/assets/layout.tsx`, `.../terms/page.tsx`, `.../privacy/page.tsx`, `frontend/public/` |
| **Agente** | `front-marketplace` |
| **Cambio** | (a) Crear una OG image de **1200×630**; hoy se usa el logo cuadrado de 512×512 con `twitter:card: summary_large_image`, que espera ratio 2:1. (b) Agregar `images` al bloque `openGraph` de `/assets`, `/terms` y `/privacy`: al declarar `openGraph` sin `images`, Next **no hereda** el del root y esas páginas quedan **sin `og:image`**. (c) Alinear el `twitter:title` de `/terms` y `/privacy`, que hoy muestra el título del sitio y no el de la página |
| **Qué se gana** | CTR al compartir en WhatsApp y LinkedIn, que es el canal de difusión inicial más probable. No afecta ranking |
| **Evidencia** | Verificado en el HTML servido de las tres páginas |

---

## P2 — Dependen de que haya inventario. Preparar, no publicar todavía

### P2-15 · Landings de categoría con umbral de indexación

| | |
|---|---|
| **Archivo** | `frontend/app/(public)/assets/categoria/[categoria]/page.tsx` (nuevo) |
| **Agente** | `front-marketplace` |
| **Cambio** | 7 landings SSR, una por valor del enum (`software · design · business_model · content · brand · project · other`), tomando etiquetas de `frontend/lib/asset-categories.ts`. **`generateMetadata` decide la indexación según el `total` que devuelve la API**: `total >= 3` → `index` y entra al sitemap; `total < 3` → `noindex, follow` y fuera del sitemap |
| **Qué se gana** | Captura la faceta más buscada del catálogo sin publicar thin content. Siete páginas vacías idénticas apuntando todas al registro son doorway pages y degradan la evaluación de calidad del sitio entero |
| **Bloqueo** | **No abrir a indexación hasta pasar el umbral.** Construir la ruta ahora está bien |

### P2-16 · `CollectionPage` + `ItemList` en el catálogo

| | |
|---|---|
| **Archivo** | `frontend/app/(public)/assets/page.tsx` y las landings de categoría |
| **Agente** | `front-marketplace` |
| **Cambio** | JSON-LD `CollectionPage` con `ItemList` de los activos de la página |
| **Qué se gana** | Hoy `/assets` no tiene ningún dato estructurado |
| **Restricción** | Sin `seller`, sin `brand`, sin `availability`, sin `AggregateRating` — el MVP no tiene rating de usuarios y la plataforma no vende. Mismo criterio que el `Product` del detalle |
| **Depende de** | P1-10 |

### P2-17 · Sitemap de activos: slugs y paginación

| | |
|---|---|
| **Archivo** | `frontend/app/sitemap.ts` |
| **Agente** | `front-marketplace` |
| **Cambio** | (a) Emitir `/assets/<slug>` en vez de `/assets/<uuid>` (depende de P1-09). (b) El `limit=200&page=1` actual **trunca en 200 activos**: paginar o usar un sitemap index. (c) Sumar las landings de categoría que pasen el umbral |
| **Qué se gana** | Que el catálogo entero sea descubrible cuando supere los 200 activos, y con las URLs correctas |

### P2-18 · `viewCount` no debería contar bots

| | |
|---|---|
| **Archivo** | `backend/assets-service/src/modules/assets/assets.service.ts` (`findOne`, `findBySlug`) |
| **Agente** | `svc-assets` |
| **Cambio** | No incrementar `viewCount` en peticiones de crawlers, o mover el conteo a una señal del cliente |
| **Qué se gana** | Hoy cada rastreo de Googlebot infla el contador **y escribe en la base**. El número se muestra como prueba social ("N vistas") en el detalle: con el catálogo indexado, la métrica queda contaminada y hay una escritura de DB por rastreo |
| **Prioridad** | Baja hasta que Google rastree el catálogo; entonces sube |

---

## P3 — Infraestructura, sujeto a decisión de negocio

### P3-19 · Activar el proxy de Cloudflare (CDN)

| | |
|---|---|
| **Archivo** | Configuración de Cloudflare (no es un archivo del repo) |
| **Agente** | `gw-infra` |
| **Cambio** | Pasar de DNS-only a proxy. **Antes, revisar el `Cache-Control: s-maxage=31536000` con que responde la home** |
| **Qué se gana** | TTFB medido de **900 ms** en la home y 726 ms en `/assets`; el origen está en Railway `mia1` (Miami) y el público objetivo es LATAM. Es el techo de rendimiento del sitio y no se rompe optimizando JavaScript |
| **Riesgo** | Un CDN por delante de una cabecera de caché de un año congela el contenido. También hay que validar que no rompa la autenticación ni el proxy del gateway |
| **Marcado como** | **Decisión de negocio** (riesgo de infraestructura) |

---

## Decisiones que van al dueño del proyecto, no a un agente

1. **Presupuesto de herramienta de keyword research.** Sin datos de volumen, la
   priorización de contenido es razonada pero no medida.
2. **Quién escribe las 5-8 guías del cluster A.** *Es la decisión de mayor
   impacto del informe:* sin recurso editorial no hay estrategia de fase 0 y el
   sitio se queda esperando al inventario sin hacer nada.
3. **Si `/guias/[slug]` existe como sección del producto** (modelo de contenido,
   flujo de publicación, mantenimiento).
4. **Activar el CDN** (ver P3-19).
5. **Cómo se consigue el primer inventario.** Es la restricción central y **no la
   resuelve el SEO**: los primeros 20-50 activos salen de captación directa,
   alianzas o carga propia.
