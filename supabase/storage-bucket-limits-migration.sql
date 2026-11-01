-- Ejecutar una vez en Supabase SQL Editor para endurecer el bucket existente.
-- Limita en servidor el tamaño máximo (5 MB) y los tipos MIME permitidos
-- (solo imágenes raster seguras: JPG, PNG, WebP y AVIF; bloquea SVG/HTML).
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'products';
