import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';
import { ArticleImage } from '@/types/article';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/articles/:id/images - 获取文章图片列表
 */
export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { data: images, error } = await supabase
      .from('article_images')
      .select('*')
      .eq('article_id', id)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return successResponse({
      article_id: id,
      images: images as ArticleImage[],
      total: images?.length || 0,
    });
  } catch (error: any) {
    console.error('获取图片列表失败:', error);
    return errorResponse(error.message || '获取图片列表失败', 500);
  }
});

/**
 * POST /api/articles/:id/images - 上传图片
 */
export const POST = withAuth(async (req: NextRequest, context: RouteContext) => {
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sortOrder = parseInt(formData.get('sort_order') as string) || 0;

    if (!file) {
      return errorResponse('请上传文件');
    }

    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName);

    // 保存到数据库
    const { data: imageRecord, error: dbError } = await supabase
      .from('article_images')
      .insert({
        article_id: id,
        url: urlData.publicUrl,
        storage_path: fileName,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return successResponse(imageRecord as ArticleImage, 201);
  } catch (error: any) {
    console.error('上传图片失败:', error);
    return errorResponse(error.message || '上传图片失败', 500);
  }
});

/**
 * DELETE /api/articles/:id/images - 删除图片（通过 query 参数指定 image_id）
 */
export const DELETE = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('image_id');

    if (!imageId) {
      return errorResponse('缺少 image_id 参数');
    }

    const supabase = getServiceSupabase();

    // 获取图片信息
    const { data: image, error: fetchError } = await supabase
      .from('article_images')
      .select('*')
      .eq('id', imageId)
      .eq('article_id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return errorResponse('图片不存在', 404);
      }
      throw fetchError;
    }

    // 从 Storage 删除
    if (image.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('article-images')
        .remove([image.storage_path]);

      if (storageError) {
        console.error('删除存储文件失败:', storageError);
      }
    }

    // 从数据库删除
    const { error: deleteError } = await supabase
      .from('article_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) throw deleteError;

    return successResponse({ message: '图片已删除' });
  } catch (error: any) {
    console.error('删除图片失败:', error);
    return errorResponse(error.message || '删除图片失败', 500);
  }
});
