-- Seed cover images for Digital Axios assets
UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=450&fit=crop&auto=format'
  WHERE slug = 'da-vinci-inventa-plataforma-white-label';

UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=450&fit=crop&auto=format'
  WHERE slug = 'kit-lanzamiento-startups-digital-axios';

UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=450&fit=crop&auto=format'
  WHERE slug = 'metodologia-producto-digital-digital-axios';

UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop&auto=format'
  WHERE slug = 'sistema-diseno-da-vinci-design-system';

-- Cover images for general seed assets (software)
UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=450&fit=crop&auto=format'
  WHERE slug LIKE '%saas%' OR slug LIKE '%software%' OR category = 'software' LIMIT 6;

-- Cover images for design assets
UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=800&h=450&fit=crop&auto=format'
  WHERE category = 'design' AND cover_image_url IS NULL LIMIT 4;

-- Cover images for business_model assets
UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop&auto=format'
  WHERE category = 'business_model' AND cover_image_url IS NULL LIMIT 4;

-- Cover images for brand assets
UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=450&fit=crop&auto=format'
  WHERE category = 'brand' AND cover_image_url IS NULL LIMIT 4;

-- Cover images for content assets
UPDATE assets SET cover_image_url = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=450&fit=crop&auto=format'
  WHERE category = 'content' AND cover_image_url IS NULL LIMIT 4;
