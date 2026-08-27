/**
 * CATALOGO REAL — activos de Digital Axios / Da Vinci Inventa.
 * =============================================================================
 *
 * Este archivo es CONTENIDO, no codigo: es lo que va a ver el visitante y lo que
 * va a indexar Google. Se revisa como se revisa una landing, no como se revisa
 * un fixture.
 *
 * REGLAS QUE CUMPLE TODO LO QUE ESTE ACA
 * -------------------------------------------------------------------------
 * 1. Cada afirmacion es verificable. No hay metricas inventadas ("15+ productos
 *    lanzados", "80 componentes") ni prueba social fabricada.
 * 2. Ningun texto promete algo que la plataforma no hace: no verificamos
 *    titularidad, no procesamos pagos, no firmamos contratos, no somos garantes.
 *    Lo que promete cada ficha lo promete el TITULAR sobre su propio activo, y
 *    tiene que estar dispuesto a cumplirlo.
 * 3. Nada de `viewCount` / `requestCount` sembrados. Ver NOTA-METRICAS abajo.
 * 4. Los primeros 155 caracteres de `description` tienen que funcionar solos:
 *    `frontend/app/(public)/assets/[id]/page.tsx` arma la meta description con
 *    `description.slice(0, 155)`, sin puntos suspensivos y sin cortar por
 *    palabra. Ese recorte ES el snippet de Google. `--dry-run` lo verifica.
 * 5. Sin `coverImageUrl` por defecto. Ver NOTA-IMAGENES abajo.
 *
 * NOTA-METRICAS
 * -------------------------------------------------------------------------
 * `viewCount` y `requestCount` NO se siembran, por tres razones que apuntan al
 * mismo lado:
 *   - `CreateAssetDto` no los acepta y el ValidationPipe corre con
 *     `forbidNonWhitelisted`: mandarlos devuelve 400. La unica forma de
 *     inyectarlos es por debajo de la API, que es justo lo que no vamos a hacer.
 *   - El frontend los usa como prueba social: `AssetCard` pinta un badge de
 *     "popularidad" segun el umbral y la landing ordena por `viewCount`.
 *     Sembrarlos no es decorar la base, es fabricar demanda.
 *   - El posicionamiento del producto es la confianza. Un catalogo que arranca
 *     en 0 vistas es un catalogo nuevo; uno que arranca en 1580 vistas y 42
 *     solicitudes con cero conversaciones abiertas es una mentira que cualquiera
 *     detecta al mandar la primera solicitud.
 *
 * NOTA-IMAGENES
 * -------------------------------------------------------------------------
 * `coverImageUrl` va vacio a proposito.
 *   - `/uploads` del assets-service esta MUERTO en produccion: el servicio ya no
 *     tiene dominio publico, asi que cualquier URL servida desde ahi da 404. Y
 *     aunque lo tuviera, el disco del contenedor es efimero: un redeploy borra
 *     lo subido. `POST /assets/upload-image` esta roto en prod por partida doble.
 *   - Las URLs de Unsplash de `prisma/seed_cover_images.sql` cargarian (el
 *     `remotePatterns` del frontend acepta `https://**`), pero son fotos stock
 *     genericas. Una foto de un escritorio como portada de "sistema de diseño"
 *     se lee como relleno, y relleno es exactamente lo que estamos evitando.
 *   - Sin portada, `AssetCard` cae a un degrade por categoria con el icono del
 *     tipo de activo. Es sobrio, es de marca, y no rompe nada.
 * Cuando existan capturas reales, se suben al origen del FRONTEND (que si tiene
 * dominio publico) y se completa `coverImage` con la URL absoluta. El loader
 * hace HEAD sobre cada una y se niega a publicar una portada que no responda
 * 2xx: preferimos sin imagen antes que con imagen rota.
 *
 * PENDIENTES DE CONFIRMACION DEL TITULAR — ver el bloque `_confirmar` de cada
 * activo. El loader los imprime en `--dry-run` y los repite antes de escribir.
 */

/**
 * Los campos son los del `CreateAssetDto` del assets-service (nombres del
 * BACKEND, no los del frontend): `category`, `pricingType`, `price`.
 * La traduccion a `assetType` / `priceType` / `priceFixed` la hace `mapAsset()`
 * en el frontend. No la repliquemos aca.
 *
 * `slug` NO se manda: lo deriva el servicio del titulo (`slug.util.ts`) y es
 * inmutable. Los slugs escritos a mano en `prisma/seed*.sql` son irrelevantes.
 *
 * `_confirmar` y `_cambios` son metadatos de revision: el loader los saca antes
 * de armar el body.
 */
export const CATALOG = [
  {
    title: 'Da Vinci Inventa — Plataforma White-Label',
    description:
      'Licencia completa de la plataforma que estás usando ahora, para que operes tu propio marketplace de licencias de activos intelectuales con tu propia marca. ' +
      'Incluye el frontend en Next.js 15, el backend de microservicios NestJS, el esquema de base de datos PostgreSQL, el API gateway con autenticación JWT, ' +
      'el módulo de solicitudes y mensajería entre titular y licenciatario, y el panel de administración con moderación de publicaciones. ' +
      'Se entrega con documentación de despliegue y acompañamiento técnico durante la puesta en marcha.',
    category: 'software',
    licenseType: 'exclusive',
    pricingType: 'negotiable',
    // Sin `price`: con `pricingType: negotiable`, `mapAsset()` fuerza
    // `priceFixed: undefined` y el frontend NUNCA muestra el numero. Guardar
    // 25000 ahi era dato muerto. Si el precio tiene que verse, el campo a
    // cambiar es `pricingType`, no `price`.
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: [
      'operar un marketplace propio',
      'personalizar marca, dominio y contenidos',
      'agregar categorías y verticales',
    ],
    restrictions: ['no competir directamente con Da Vinci Inventa en Argentina'],
    tags: ['white-label', 'marketplace', 'SaaS', 'Next.js', 'NestJS', 'PostgreSQL'],
    _cambios: [
      'Se quitó "sistema de autenticación OAuth": el callback de OAuth está deshabilitado a propósito en el gateway (ver el comentario del .exclude() en gateway/src/app.module.ts). Se reemplazó por autenticación JWT, que sí funciona hoy.',
      'Se quitó el precio de 25000 USD: con pricingType negotiable el frontend no lo muestra.',
      'Se restauraron los acentos, que el seed .sql había perdido.',
    ],
    _confirmar: [
      'licenseType "exclusive" a nivel Mundial: implica un único licenciatario en el mundo. Si la idea es licenciarla más de una vez, va "non_exclusive".',
      '"acompañamiento técnico durante la puesta en marcha" es un compromiso del titular. Confirmar que estás dispuesto a sostenerlo.',
    ],
  },

  {
    title: 'Kit de Lanzamiento para Startups — Digital Axios',
    description:
      'Base técnica completa para que una startup pase de la idea al producto en marcha sin tener que rearmar desde cero toda la infraestructura ni el despliegue. ' +
      'Incluye la arquitectura de sistema documentada, el stack tecnológico preconfigurado, pipeline de integración y despliegue continuo, ' +
      'infraestructura en la nube lista para desplegar, documentación técnica del proyecto y sesiones de consultoría para adaptarlo a tu producto.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 8500,
    currency: 'USD',
    territory: 'Latinoamérica',
    allowedUses: ['uso en proyecto propio', 'personalizar y adaptar'],
    restrictions: ['no redistribuir como producto independiente'],
    tags: ['startup', 'arquitectura', 'CI/CD', 'infraestructura', 'consultoría'],
    _cambios: [
      'Se quitó "Probado en 15+ productos lanzados": número no verificable, y del tipo que se lee como prueba social fabricada.',
      'Se quitó "lanzar en 30 días": es una promesa de plazo sobre un trabajo que depende del cliente. Si querés sostenerla, tiene que estar en la propuesta comercial, no en el catálogo público.',
    ],
    _confirmar: [
      'Territorio "Latinoamérica" para un kit técnico: no hay motivo obvio para la restricción geográfica. Confirmar o pasar a "Mundial".',
      'Si el "15+ productos lanzados" es real y lo podés respaldar, decímelo y lo reincorporo con esa redacción.',
    ],
  },

  {
    title: 'Metodología de Producto Digital — Digital Axios',
    description:
      'Framework propietario de 16 semanas para llevar una idea hasta un producto digital validado, con cada etapa y cada entregable definidos desde el principio. ' +
      'Cubre discovery con usuarios, definición del alcance del MVP, sprints de desarrollo, lanzamiento y seguimiento de métricas. ' +
      'Se entrega con las plantillas de trabajo en Notion, los workshops facilitados por el equipo de Digital Axios y acompañamiento durante la implementación.',
    category: 'business_model',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 4200,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['uso en equipo propio', 'adaptación al rubro'],
    restrictions: ['creditar a Digital Axios como fuente'],
    tags: ['metodología', 'producto digital', 'discovery', 'MVP', 'consultoría'],
    _cambios: [
      'Sin cambios de fondo: esta ficha no tenía números inventados. Se reescribió para que los primeros 155 caracteres funcionen como snippet.',
    ],
    _confirmar: [
      'Territorio "Argentina": una metodología con workshops remotos podría venderse en toda la región. Confirmar.',
    ],
  },

  {
    title: 'Sistema de Diseño Da Vinci — Tokens y Componentes',
    description:
      'El sistema de diseño con el que está construido Da Vinci Inventa, listo para usarse como base de otro producto en Next.js y Tailwind. ' +
      'Incluye la paleta de marca con alias semánticos, la escala tipográfica de nueve niveles sobre Inter y Poppins, la escala de espaciado, ' +
      'modo oscuro nativo por clase, foco visible global y la biblioteca de componentes React tipados que usa la plataforma en producción. ' +
      'Se entrega el código fuente junto con las guías de uso y de redacción de interfaz en español.',
    category: 'design',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 3800,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['uso en productos propios', 'modificación libre', 'proyectos comerciales'],
    restrictions: ['no redistribuir como sistema de diseño independiente'],
    tags: ['design system', 'tokens', 'Tailwind', 'React', 'dark mode', 'accesibilidad'],
    _cambios: [
      'CORRECCION IMPORTANTE — se quitó "Más de 80 componentes listos para producción". El repositorio tiene 21 componentes .tsx en total (13 en components/ui). Era una afirmación falsa contrastable contra el propio producto que la ficha dice describir.',
      'Se quitó "Figma incluido": no hay ningún archivo de Figma en el repositorio. Si el archivo existe fuera del repo, avisame y lo reincorporo con el número real de componentes.',
      'La descripción pasó a enumerar lo que sí existe y es verificable: tokens de color con alias semánticos, escala tipográfica de 9 niveles, escala de espaciado, dark mode por clase, focus ring global.',
      'El seed original escribía "espanol" sin ñ, en la ficha que justamente vende guías de redacción en español.',
    ],
    _confirmar: [
      '¿Existe el archivo de Figma? Si existe, cuántos componentes tiene realmente.',
      'A 3800 USD, un sistema de 21 componentes es un precio alto para lo que se entrega. Vale revisar el precio o ampliar el alcance antes de publicar.',
    ],
  },
];

/**
 * ACTIVOS EXCLUIDOS DEL CATALOGO DE PRODUCCION
 * =============================================================================
 * `prisma/seed.sql` y `prisma/seed.ts` traen 20 activos mas, a nombre de
 * `8ce308d7-…` (maria@davinci.com) y `c13157d2-…` (valenbongiorno11@gmail.com).
 * NO estan en `CATALOG` y la recomendacion es que no se publiquen.
 *
 * No son "los activos de Digital Axios con menos detalle": son inventario
 * ficticio. Entre otros ofrecen en licencia:
 *   - una PATENTE de proceso de fermentacion de kombucha que no existe;
 *   - "acuerdos marco con 3 distribuidoras nacionales" del canal farmaceutico;
 *   - un dataset de "+2.000 proveedores industriales con contactos verificados";
 *   - respaldo del tipo "mas de 50 negocios en piloto", "40+ proyectos reales".
 *
 * El problema no es que sean de relleno. Es que en un marketplace de licencias
 * son OFERTAS PUBLICAS DE LICENCIA sobre propiedad intelectual inexistente,
 * publicadas por cuentas de la propia casa, en una plataforma que declara
 * explicitamente que NO verifica titularidad. Un emprendedor que mande una
 * solicitud por la patente de kombucha no recibe nada del otro lado.
 *
 * Para SEO tampoco conviene: 4 fichas reales y profundas indexan mejor que 24
 * de las cuales 20 son fabricaciones que el sistema de contenido util de Google
 * penaliza justamente por eso.
 *
 * Se dejan donde estan (`prisma/seed.ts`) como fixture de desarrollo local, que
 * es para lo que sirven. Si el dueño decide igual publicarlos, la decision es
 * suya y consciente: agregarlos aca es copiar y pegar.
 */
export const EXCLUIDOS_MOTIVO =
  'inventario ficticio de prisma/seed.ts — ver el bloque ACTIVOS EXCLUIDOS en scripts/catalog.data.mjs';
