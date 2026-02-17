import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';
import { canTransitionTo, getAllowedNextStatuses } from '@/lib/status';
import { Article, ArticleStatus } from '@/types/article';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/articles/:id/status - 状态流转
 */
export const PUT = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return errorResponse('缺少 status 参数');
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

    const currentStatus = article.status as ArticleStatus;
    const newStatus = status as ArticleStatus;

    // 验证状态转换是否允许
    if (!canTransitionTo(currentStatus, newStatus)) {
      const allowed = getAllowedNextStatuses(currentStatus);
      return errorResponse(
        `不允许从 "${currentStatus}" 转换到 "${newStatus}"。允许的状态：${allowed.join(', ')}`,
        400
      );
    }

    // 更新状态
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return successResponse({
      article: updatedArticle as Article,
      previous_status: currentStatus,
      new_status: newStatus,
    });
  } catch (error: any) {
    console.error('状态流转失败:', error);
    return errorResponse(error.message || '状态流转失败', 500);
  }
});

/**
 * GET /api/articles/:id/status - 获取允许的下一状态
 */
export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { data: article, error } = await supabase
      .from('articles')
      .select('status')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('文章不存在', 404);
      }
      throw error;
    }

    const currentStatus = article.status as ArticleStatus;
    const allowedStatuses = getAllowedNextStatuses(currentStatus);

    return successResponse({
      current_status: currentStatus,
      allowed_next_statuses: allowedStatuses,
    });
  } catch (error: any) {
    console.error('获取状态信息失败:', error);
    return errorResponse(error.message || '获取状态信息失败', 500);
  }
});
