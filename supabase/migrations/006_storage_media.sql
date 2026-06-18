-- Bucket público para imágenes y archivos de WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760, -- 10 MB por archivo
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4',
    'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/x-m4a',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- El service role puede subir archivos (servidor)
CREATE POLICY "Service role can upload media"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'media');

-- Cualquiera puede leer (bucket público)
CREATE POLICY "Public can read media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');
