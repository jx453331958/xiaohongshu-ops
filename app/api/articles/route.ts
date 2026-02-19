import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';
import { Article } from '@/types/article';

/**
 * GET /api/articles - 获取文章列表
 */
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tag = searchParams.get('tag');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const supabase = getServiceSupabase();
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 筛选条件
    if (status) {
      query = query.eq('status', status);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return successResponse({
      articles: data as Article[],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('获取文章列表失败:', error);
    return errorResponse(error.message || '获取文章列表失败', 500);
  }
});

/**
 * POST /api/articles - 创建文章
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { title, content, tags, category } = body;

    if (!title) {
      return errorResponse('标题不能为空');
    }

    const supabase = getServiceSupabase();
    
    // 创建文章
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        title,
        content: content || null,
        tags: tags || [],
        category: category || null,
        status: 'draft',
      })
      .select()
      .single();

    if (articleError) throw articleError;

    // 创建第一个版本
    const { error: versionError } = await supabase
      .from('article_versions')
      .insert({
        article_id: article.id,
        title,
        content: content || null,
        version_num: 1,
      });

    if (versionError) throw versionError;

    return successResponse(article as Article, 201);
  } catch (error: any) {
    console.error('创建文章失败:', error);
    return errorResponse(error.message || '创建文章失败', 500);
  }
});
