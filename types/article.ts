export type ArticleStatus = 'draft' | 'pending_render' | 'pending_review' | 'published' | 'archived';

export interface Article {
  id: string;
  title: string;
  content: string | null;
  status: ArticleStatus;
  tags: string[];
  category: string | null;
  xhs_note_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  title: string;
  content: string | null;
  version_num: number;
  created_at: string;
}

export interface ArticleImage {
  id: string;
  article_id: string;
  url: string;
  storage_path: string | null;
  html_url: string | null;
  html_storage_path: string | null;
  sort_order: number;
  created_at: string;
}

export interface ArticleStats {
  id: string;
  article_id: string;
  views: number;
  likes: number;
  favorites: number;
  comments: number;
  recorded_at: string;
}
