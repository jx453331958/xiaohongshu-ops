-- 允许 article-images 存储桶存储 HTML 文件
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','text/html']
WHERE id = 'article-images';
