import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';
import { ArticleVersion } from '@/types/article';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/articles/:id/versions - 获取文章版本历史
 */
export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    // 验证文章是否存在
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('id', id)
      .single();

    if (articleError) {
      if (articleError.code === 'PGRST116') {
        return errorResponse('文章不存在', 404);
      }
      throw articleError;
    }

    // 获取版本历史
    const { data: versions, error: versionsError } = await supabase
      .from('article_versions')
      .select('*')
      .eq('article_id', id)
      .order('version_num', { ascending: false });

    if (versionsError) throw versionsError;

    return successResponse({
      article_id: id,
      versions: versions as ArticleVersion[],
      total: versions?.length || 0,
    });
  } catch (error: any) {
    console.error('获取版本历史失败:', error);
    return errorResponse(error.message || '获取版本历史失败', 500);
  }
});
