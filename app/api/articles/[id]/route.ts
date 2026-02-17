import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';
import { Article } from '@/types/article';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/articles/:id - 获取文章详情
 */
export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('文章不存在', 404);
      }
      throw error;
    }

    return successResponse(article as Article);
  } catch (error: any) {
    console.error('获取文章详情失败:', error);
    return errorResponse(error.message || '获取文章详情失败', 500);
  }
});

/**
 * PUT /api/articles/:id - 更新文章
 */
export const PUT = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { title, content, tags, category } = body;

    const supabase = getServiceSupabase();

    // 获取当前文章
    const { data: currentArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return errorResponse('文章不存在', 404);
      }
      throw fetchError;
    }

    // 更新文章
    const updates: Partial<Article> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    if (category !== undefined) updates.category = category;

    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 如果标题或内容有更新，创建新版本
    if (title !== undefined || content !== undefined) {
      // 获取最新版本号
      const { data: versions } = await supabase
        .from('article_versions')
        .select('version_num')
        .eq('article_id', id)
        .order('version_num', { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_num || 0) + 1;

      await supabase.from('article_versions').insert({
        article_id: id,
        title: title || currentArticle.title,
        content: content !== undefined ? content : currentArticle.content,
        version_num: nextVersion,
      });
    }

    return successResponse(updatedArticle as Article);
  } catch (error: any) {
    console.error('更新文章失败:', error);
    return errorResponse(error.message || '更新文章失败', 500);
  }
});

/**
 * DELETE /api/articles/:id - 删除文章
 */
export const DELETE = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse({ message: '文章已删除' });
  } catch (error: any) {
    console.error('删除文章失败:', error);
    return errorResponse(error.message || '删除文章失败', 500);
  }
});
