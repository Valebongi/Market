-- Insert tags for each asset based on slug
INSERT INTO asset_tags (id, asset_id, tag)
SELECT gen_random_uuid(), a.id, unnest(tags.tag_list)
FROM assets a
JOIN (VALUES
  ('pos-saas-para-retail-modulo-completo',          ARRAY['SaaS', 'POS', 'retail', 'AFIP', 'MercadoPago']),
  ('motor-de-recomendaciones-con-ia',               ARRAY['IA', 'machine learning', 'e-commerce', 'Python', 'FastAPI']),
  ('app-de-turnos-y-agendamiento',                  ARRAY['turnos', 'agenda', 'salud', 'React Native', 'WhatsApp']),
  ('plataforma-de-cursos-online-lms',               ARRAY['LMS', 'educacion', 'cursos', 'Next.js', 'e-learning']),
  ('api-validacion-cuit-cuil',                      ARRAY['AFIP', 'CUIT', 'validacion', 'API', 'fiscal']),
  ('sistema-de-delivery-para-restaurantes',         ARRAY['delivery', 'restaurantes', 'GPS', 'PedidosYa']),
  ('identidad-visual-fintech-moderna',              ARRAY['identidad visual', 'fintech', 'branding', 'Figma', 'logo']),
  ('kit-ui-apps-de-salud-200-componentes',          ARRAY['UI kit', 'salud', 'Figma', 'React', 'componentes']),
  ('marca-premium-cafeteria-boutique',              ARRAY['cafeteria', 'branding', 'packaging', 'logo', 'gastro']),
  ('sistema-de-diseno-edtech',                      ARRAY['design system', 'EdTech', 'WCAG', 'tokens', 'Figma']),
  ('modelo-franquicia-lavanderia-self-service',     ARRAY['franquicia', 'lavanderia', 'self-service', 'retail']),
  ('modelo-b2b-saas-vertical-agropecuario',         ARRAY['B2B', 'SaaS', 'agro', 'agtech', 'ventas']),
  ('metodologia-consultoria-transformacion-digital-pyme', ARRAY['consultoria', 'PYME', 'metodologia', 'digital']),
  ('modelo-suscripcion-servicios-limpieza-premium', ARRAY['suscripcion', 'servicios', 'limpieza', 'recurrente']),
  ('curso-online-inversion-cedears-principiantes',  ARRAY['finanzas', 'inversion', 'CEDEARs', 'curso', 'AFIP']),
  ('pack-contenidos-marca-personal-linkedin',       ARRAY['LinkedIn', 'marca personal', 'contenido', 'copywriting']),
  ('base-datos-proveedores-industriales-argentina', ARRAY['base de datos', 'proveedores', 'industrial', 'B2B']),
  ('algoritmo-rutas-ultima-milla-urbana',           ARRAY['logistica', 'ultima milla', 'Python', 'algoritmo']),
  ('patente-fermentacion-acelerada-kombucha',       ARRAY['patente', 'kombucha', 'fermentacion', 'alimentos'])
) AS tags(slug, tag_list) ON a.slug = tags.slug;
