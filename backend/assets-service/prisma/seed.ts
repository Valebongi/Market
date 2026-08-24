import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_1 = '8ce308d7-e3bc-401d-b1d1-357523a677c4'; // maria@davinci.com
const OWNER_2 = 'c13157d2-567c-462d-8da1-233333afc36f'; // valenbongiorno11@gmail.com

const assets = [
  // ── SOFTWARE ──────────────────────────────────────────────────────────
  {
    ownerId: OWNER_1,
    title: 'POS SaaS para Retail – Módulo Completo',
    description:
      'Sistema de punto de venta en la nube para comercios minoristas. Incluye inventario en tiempo real, facturación AFIP compatible, dashboard de ventas e integración con MercadoPago. Arquitectura multi-tenant lista para escalar.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 4500,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['comercialización', 'personalización', 'reventa como SaaS'],
    restrictions: ['no modificar marca principal', 'no sublicenciar a terceros sin acuerdo'],
    tags: ['SaaS', 'POS', 'retail', 'AFIP', 'MercadoPago', 'multi-tenant'],
    viewCount: 312,
    requestCount: 18,
  },
  {
    ownerId: OWNER_2,
    title: 'Motor de Recomendaciones con IA para E-commerce',
    description:
      'Algoritmo de recomendaciones personalizado basado en comportamiento de usuario. Implementado con Python + FastAPI, integrable como microservicio REST. Incluye modelo preentrenado con datos de retail argentino y panel de métricas.',
    category: 'software',
    licenseType: 'exclusive',
    pricingType: 'negotiable',
    price: 12000,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['integración en plataforma propia', 'personalización del modelo'],
    restrictions: ['uso exclusivo para un licenciatario a la vez'],
    tags: ['IA', 'machine learning', 'recomendaciones', 'e-commerce', 'Python', 'FastAPI'],
    viewCount: 489,
    requestCount: 7,
  },
  {
    ownerId: OWNER_1,
    title: 'App de Turnos y Agendamiento – Clínicas y Salones',
    description:
      'Plataforma de gestión de turnos online para clínicas, salones de belleza y estudios. Incluye app mobile (React Native), recordatorios por WhatsApp, pago anticipado y sistema de fidelización. Más de 50 negocios la usaron en piloto.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 3200,
    currency: 'USD',
    territory: 'Latinoamérica',
    allowedUses: ['uso propio', 'white-label', 'integración con sistemas existentes'],
    restrictions: ['no redistribuir el código fuente'],
    tags: ['turnos', 'agenda', 'salud', 'belleza', 'React Native', 'WhatsApp'],
    viewCount: 278,
    requestCount: 22,
  },
  {
    ownerId: OWNER_2,
    title: 'Plataforma de Cursos Online – LMS Personalizable',
    description:
      'Sistema de gestión de aprendizaje (LMS) construido con Next.js y Node.js. Soporte para videos, quizzes, certificados automáticos, subscripciones y comunidad de estudiantes. Diseño moderno con dark mode incluido.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 5800,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['lanzar plataforma educativa propia', 'personalizar y revender'],
    restrictions: ['debe mantenerse crédito en el footer durante primer año'],
    tags: ['LMS', 'educación', 'cursos', 'Next.js', 'certificados', 'e-learning'],
    viewCount: 541,
    requestCount: 31,
  },
  {
    ownerId: OWNER_1,
    title: 'API de Validación de CUIT/CUIL en Tiempo Real',
    description:
      'Servicio REST para validar CUIT/CUIL contra AFIP con caché inteligente, manejo de rate limits y respuesta en menos de 200ms. Incluye SDKs para Node.js, Python y PHP. Documentación Swagger completa.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 800,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['integración en productos propios', 'consultas ilimitadas'],
    restrictions: ['no exponer la API a terceros sin licencia adicional'],
    tags: ['AFIP', 'CUIT', 'validación', 'API', 'fiscal', 'Argentina'],
    viewCount: 933,
    requestCount: 45,
  },
  {
    ownerId: OWNER_2,
    title: 'Sistema de Delivery para Restaurantes – Módulo Completo',
    description:
      'Solución end-to-end para restaurantes con delivery propio: app para clientes, panel de cocina en tiempo real, gestión de repartidores con GPS y métricas de demora. Integración con PedidosYa y Rappi disponible.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'negotiable',
    price: 7500,
    currency: 'USD',
    territory: 'Latinoamérica',
    allowedUses: ['white-label', 'personalización completa', 'multi-restaurante'],
    restrictions: ['no usar para competidor directo del licenciante'],
    tags: ['delivery', 'restaurantes', 'GPS', 'cocina digital', 'PedidosYa'],
    viewCount: 387,
    requestCount: 14,
  },

  // ── DESIGN / BRAND ────────────────────────────────────────────────────
  {
    ownerId: OWNER_1,
    title: 'Sistema de Identidad Visual – Fintech Moderna',
    description:
      'Manual de marca completo para startup fintech: logo principal y variantes, paleta de colores, tipografías, íconos personalizados, plantillas para redes sociales, pitch deck y papelería. Entregado en AI, SVG y Figma.',
    category: 'design',
    licenseType: 'exclusive',
    pricingType: 'fixed',
    price: 2200,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['uso comercial completo', 'modificación', 'registro de marca'],
    restrictions: ['uso exclusivo para un licenciatario'],
    tags: ['identidad visual', 'fintech', 'branding', 'Figma', 'logo', 'UI kit'],
    viewCount: 621,
    requestCount: 9,
  },
  {
    ownerId: OWNER_2,
    title: 'Kit UI para Apps de Salud – 200+ Componentes',
    description:
      'Librería completa de componentes UI diseñados para aplicaciones de salud y bienestar. Incluye dashboards de métricas, calendarios médicos, formularios de historial clínico y onboarding. Compatible con Figma y React.',
    category: 'design',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 1500,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['proyectos comerciales ilimitados', 'modificación libre'],
    restrictions: ['no redistribuir como kit separado'],
    tags: ['UI kit', 'salud', 'Figma', 'React', 'componentes', 'diseño'],
    viewCount: 445,
    requestCount: 27,
  },
  {
    ownerId: OWNER_1,
    title: 'Marca Premium para Cafetería Boutique',
    description:
      'Identidad de marca completa lista para usar en una cafetería premium o specialty coffee shop: logo, packaging, señalética, uniformes, menú impreso y digital, y assets para Instagram. Estética minimalista con toques cálidos.',
    category: 'brand',
    licenseType: 'exclusive',
    pricingType: 'fixed',
    price: 1800,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['uso comercial completo', 'impresión ilimitada', 'registro de marca'],
    restrictions: ['exclusivo para una sola marca/local'],
    tags: ['cafetería', 'branding', 'packaging', 'logo', 'gastronómico', 'minimalista'],
    viewCount: 298,
    requestCount: 11,
  },
  {
    ownerId: OWNER_2,
    title: 'Sistema de Diseño para Plataformas EdTech',
    description:
      'Design system completo pensado para productos educativos digitales. Incluye tokens de diseño, componentes accesibles (WCAG AA), guías de UX writing en español, y variantes para modo oscuro/claro. Tokens exportables a código.',
    category: 'design',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 2800,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['uso en múltiples productos', 'exportación a código', 'modificación'],
    restrictions: ['no comercializar el sistema como producto separado'],
    tags: ['design system', 'EdTech', 'accesibilidad', 'WCAG', 'tokens', 'Figma'],
    viewCount: 512,
    requestCount: 19,
  },

  // ── BUSINESS MODEL ────────────────────────────────────────────────────
  {
    ownerId: OWNER_1,
    title: 'Modelo de Franquicia para Lavandería Self-Service',
    description:
      'Manual operativo completo para franquicia de lavandería self-service: modelo financiero (ROI en 18 meses), proveedores validados, layout del local, sistema de pricing, manual de capacitación y estrategia de marketing local.',
    category: 'business_model',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 3500,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['apertura de locales propios', 'subfranquicia'],
    restrictions: ['radio de exclusividad mínima de 3km'],
    tags: ['franquicia', 'lavandería', 'self-service', 'retail', 'operaciones', 'ROI'],
    viewCount: 834,
    requestCount: 38,
  },
  {
    ownerId: OWNER_2,
    title: 'Modelo B2B SaaS – Vertical Agropecuario',
    description:
      'Framework validado para commercializar software B2B en el sector agro: estrategia de pricing por hectárea, ciclo de ventas largo (6-18 meses), playbook de ventas campo a campo, onboarding y métricas de retención SaaS para el sector.',
    category: 'business_model',
    licenseType: 'non_exclusive',
    pricingType: 'negotiable',
    price: 2200,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['implementación directa', 'consultoría a terceros'],
    restrictions: ['no competir directamente con el licenciante en la misma zona geográfica'],
    tags: ['B2B', 'SaaS', 'agro', 'agtech', 'ventas', 'pricing'],
    viewCount: 367,
    requestCount: 16,
  },
  {
    ownerId: OWNER_1,
    title: 'Metodología de Consultoría en Transformación Digital PYME',
    description:
      'Framework de 12 semanas para consultores: diagnóstico de madurez digital, hoja de ruta priorizada, talleres co-diseñados con el cliente, entregables validados y toolbox de herramientas digitales. Basado en 40+ proyectos reales en Argentina.',
    category: 'business_model',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 1800,
    currency: 'USD',
    territory: 'Latinoamérica',
    allowedUses: ['uso en consultoría propia', 'capacitación de equipos'],
    restrictions: ['no revender la metodología como producto educativo sin acuerdo'],
    tags: ['consultoría', 'transformación digital', 'PYME', 'metodología', 'framework'],
    viewCount: 423,
    requestCount: 21,
  },
  {
    ownerId: OWNER_2,
    title: 'Modelo de Suscripción para Servicios de Limpieza Premium',
    description:
      'Modelo de negocio de suscripción recurrente para empresa de limpieza domiciliaria: estructura de planes, pricing psicológico, proceso de onboarding del cliente, protocolo de servicio de alto estándar y sistema de referidos.',
    category: 'business_model',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 1200,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['implementación directa', 'adaptación a rubro similar'],
    restrictions: [],
    tags: ['suscripción', 'servicios', 'limpieza', 'recurrente', 'modelo de negocio'],
    viewCount: 289,
    requestCount: 12,
  },

  // ── CONTENT ───────────────────────────────────────────────────────────
  {
    ownerId: OWNER_1,
    title: 'Curso Online – Inversión en CEDEARs para Principiantes',
    description:
      'Curso completo en video (8hs de contenido) sobre inversión en CEDEARs desde Argentina: apertura de cuenta, selección de cartera, estrategia de largo plazo, manejo de la brecha cambiaria y declaración en AFIP. Material actualizado 2024.',
    category: 'content',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 950,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['reventa como producto educativo propio', 'personalización de marca'],
    restrictions: ['no distribuir gratuitamente', 'no modificar contenido técnico-financiero'],
    tags: ['finanzas', 'inversión', 'CEDEARs', 'Argentina', 'curso', 'educación financiera'],
    viewCount: 1243,
    requestCount: 67,
  },
  {
    ownerId: OWNER_2,
    title: 'Pack de Contenidos para Marca Personal en LinkedIn',
    description:
      '90 días de contenido estratégico para LinkedIn: 90 posts listos para publicar, 10 carruseles de alto impacto, guía de posicionamiento, estrategia de hashtags y plantillas Canva editables. Orientado a founders y profesionales senior.',
    category: 'content',
    licenseType: 'exclusive',
    pricingType: 'fixed',
    price: 750,
    currency: 'USD',
    territory: 'Mundial',
    allowedUses: ['publicación bajo marca propia', 'modificación y adaptación'],
    restrictions: ['uso exclusivo para un perfil/persona'],
    tags: ['LinkedIn', 'marca personal', 'contenido', 'redes sociales', 'copywriting'],
    viewCount: 876,
    requestCount: 43,
  },
  {
    ownerId: OWNER_1,
    title: 'Base de Datos de Proveedores Industriales – Argentina',
    description:
      'Dataset curado con +2.000 proveedores industriales argentinos: metalurgia, plásticos, electrónica y logística. Incluye contactos verificados, categorización por rubro, zona geográfica, capacidad productiva y evaluación de proveedores.',
    category: 'content',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 1400,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['uso interno', 'integración en sistemas propios'],
    restrictions: ['no redistribuir el dataset en forma directa'],
    tags: ['base de datos', 'proveedores', 'industrial', 'Argentina', 'B2B', 'dataset'],
    viewCount: 534,
    requestCount: 28,
  },

  // ── OTHER ─────────────────────────────────────────────────────────────
  {
    ownerId: OWNER_2,
    title: 'Patente de Proceso – Fermentación Acelerada de Kombucha',
    description:
      'Proceso patentado de fermentación primaria acelerada para producción de kombucha artesanal a escala semi-industrial. Reduce el tiempo de fermentación de 14 a 6 días manteniendo perfiles de sabor premium. Incluye protocolo, fórmulas y asistencia técnica inicial.',
    category: 'other',
    licenseType: 'exclusive',
    pricingType: 'negotiable',
    price: 8500,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['producción comercial', 'adaptación del proceso'],
    restrictions: ['un licenciatario activo a la vez por territorio'],
    tags: ['patente', 'kombucha', 'fermentación', 'alimentos', 'proceso industrial'],
    viewCount: 198,
    requestCount: 5,
  },
  {
    ownerId: OWNER_1,
    title: 'Red de Distribución Validada – Canal Farmacéutico OTC',
    description:
      'Modelo operativo y contactos clave para distribución de productos OTC (over-the-counter) en farmacias de Argentina. Incluye acuerdos marco con 3 distribuidoras nacionales, protocolo de alta de producto, política de devoluciones y estrategia de visitas médicas.',
    category: 'other',
    licenseType: 'non_exclusive',
    pricingType: 'negotiable',
    price: 5000,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['uso del canal para productos propios compatibles', 'introducción a distribuidoras'],
    restrictions: ['producto debe cumplir requisitos ANMAT', 'no competir con productos actuales del licenciante'],
    tags: ['farmacéutico', 'distribución', 'OTC', 'farmacias', 'ANMAT', 'canal'],
    viewCount: 312,
    requestCount: 8,
  },
  {
    ownerId: OWNER_2,
    title: 'Algoritmo de Rutas Optimizadas – Última Milla Urbana',
    description:
      'Modelo de optimización de rutas de entrega para logística de última milla en ciudades argentinas. Considera tráfico histórico, ventanas horarias de entrega, capacidad de vehículo y restricciones de estacionamiento. Implementado en Python con interfaz web simple.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    price: 6200,
    currency: 'USD',
    territory: 'Argentina',
    allowedUses: ['integración en fleet management', 'personalización por ciudad'],
    restrictions: ['no redistribuir como servicio standalone sin acuerdo'],
    tags: ['logística', 'última milla', 'optimización de rutas', 'Python', 'algoritmo'],
    viewCount: 445,
    requestCount: 17,
  },
];

async function main() {
  console.log('🌱 Seeding assets database...');

  for (const assetData of assets) {
    const { tags, viewCount, requestCount, ...data } = assetData;

    let slug = data.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    const existing = await prisma.asset.findFirst({ where: { slug } });
    if (existing) {
      console.log(`  ⏭  Skipping (already exists): ${data.title}`);
      continue;
    }

    await prisma.asset.create({
      data: {
        ...(data as any),
        slug,
        status: 'published',
        publishedAt: new Date(),
        viewCount: viewCount ?? 0,
        requestCount: requestCount ?? 0,
        tags: tags?.length ? { create: tags.map((tag) => ({ tag })) } : undefined,
      },
    });

    console.log(`  ✓ ${data.title}`);
  }

  const total = await prisma.asset.count();
  console.log(`\n✅ Done. Total assets in DB: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
