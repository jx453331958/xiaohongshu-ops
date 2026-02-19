-- 为 article_images 表添加 HTML 源文件相关字段
ALTER TABLE article_images
  ADD COLUMN html_url TEXT,
  ADD COLUMN html_storage_path TEXT;
