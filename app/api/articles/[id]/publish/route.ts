import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';
import { Article } from '@/types/article';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/articles/:id/publish - 发布文章（记录小红书 note_id）
 */
export const POST = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { xhs_note_id, views, likes, favorites, comments } = body;

    if (!xhs_note_id) {
      return errorResponse('缺少 xhs_note_id 参数');
    }

    const supabase = getServiceSupabase();

    // 获取当前文章
    const { data: article, error: fetchError } = await supabase
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

    // 更新文章状态和 note_id
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update({
        xhs_note_id,
        status: 'published',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 如果提供了统计数据，记录初始数据
    if (views !== undefined || likes !== undefined || favorites !== undefined || comments !== undefined) {
      await supabase.from('article_stats').insert({
        article_id: id,
        views: views || 0,
        likes: likes || 0,
        favorites: favorites || 0,
        comments: comments || 0,
      });
    }

    return successResponse({
      article: updatedArticle as Article,
      message: '文章发布成功',
    });
  } catch (error: any) {
    console.error('发布文章失败:', error);
    return errorResponse(error.message || '发布文章失败', 500);
  }
});
