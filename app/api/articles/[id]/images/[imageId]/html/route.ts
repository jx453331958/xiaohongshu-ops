import { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';

const BUCKET_NAME = 'article-images';

interface RouteContext {
  params: Promise<{ id: string; imageId: string }>;
}

/**
 * 从图片的 storage_path 推导 HTML 存储路径
 * 例如: "abc-123/uuid.png" → "abc-123/uuid.html"
 */
function deriveHtmlPath(storagePath: string): string {
  return storagePath.replace(/\.[^.]+$/, '.html');
}

/**
 * GET /api/articles/:id/images/:imageId/html - 获取 HTML 源文件内容
 */
export const GET = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id, imageId } = await context.params;
    const supabase = getServiceSupabase();

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

    if (!image.html_storage_path) {
      return errorResponse('该图片没有关联的 HTML 源文件', 404);
    }

    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(image.html_storage_path);

    if (downloadError || !data) {
      return errorResponse('HTML 文件不存在', 404);
    }

    const htmlContent = await data.text();

    return successResponse({
      image_id: imageId,
      html_url: image.html_url,
      html_storage_path: image.html_storage_path,
      html_content: htmlContent,
    });
  } catch (error: any) {
    console.error('获取 HTML 失败:', error);
    return errorResponse(error.message || '获取 HTML 失败', 500);
  }
});

/**
 * POST /api/articles/:id/images/:imageId/html - 上传 HTML 源文件
 * 支持 JSON body { html: "..." } 和 multipart/form-data (file 字段)
 */
export const POST = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id, imageId } = await context.params;
    const supabase = getServiceSupabase();

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

    if (image.html_storage_path) {
      return errorResponse('该图片已有 HTML 源文件，请使用 PUT 更新', 400);
    }

    if (!image.storage_path) {
      return errorResponse('图片缺少存储路径', 400);
    }

    // 解析 HTML 内容
    let htmlContent: string;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return errorResponse('请上传 HTML 文件');
      }
      htmlContent = await file.text();
    } else {
      const body = await req.json();
      if (!body.html) {
        return errorResponse('缺少 html 字段');
      }
      htmlContent = body.html;
    }

    // 使用与图片相同 UUID 的 .html 路径
    const htmlPath = deriveHtmlPath(image.storage_path);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(htmlPath, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const htmlUrl = `/api/images/${htmlPath}`;

    const { data: updated, error: dbError } = await supabase
      .from('article_images')
      .update({ html_url: htmlUrl, html_storage_path: htmlPath })
      .eq('id', imageId)
      .select()
      .single();

    if (dbError) throw dbError;

    return successResponse(updated, 201);
  } catch (error: any) {
    console.error('上传 HTML 失败:', error);
    return errorResponse(error.message || '上传 HTML 失败', 500);
  }
});

/**
 * PUT /api/articles/:id/images/:imageId/html - 更新 HTML 源文件
 * 支持 JSON body { html: "..." } 和 multipart/form-data (file 字段)
 */
export const PUT = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id, imageId } = await context.params;
    const supabase = getServiceSupabase();

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

    if (!image.html_storage_path) {
      return errorResponse('该图片没有 HTML 源文件，请使用 POST 创建', 400);
    }

    // 解析 HTML 内容
    let htmlContent: string;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return errorResponse('请上传 HTML 文件');
      }
      htmlContent = await file.text();
    } else {
      const body = await req.json();
      if (!body.html) {
        return errorResponse('缺少 html 字段');
      }
      htmlContent = body.html;
    }

    // 覆盖更新现有文件
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .update(image.html_storage_path, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    return successResponse({
      image_id: imageId,
      html_url: image.html_url,
      html_storage_path: image.html_storage_path,
      message: 'HTML 已更新',
    });
  } catch (error: any) {
    console.error('更新 HTML 失败:', error);
    return errorResponse(error.message || '更新 HTML 失败', 500);
  }
});

/**
 * DELETE /api/articles/:id/images/:imageId/html - 删除 HTML 源文件
 */
export const DELETE = withAuth(async (req: NextRequest, context: RouteContext) => {
  try {
    const { id, imageId } = await context.params;
    const supabase = getServiceSupabase();

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

    if (!image.html_storage_path) {
      return errorResponse('该图片没有 HTML 源文件', 404);
    }

    // 从 Storage 删除
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([image.html_storage_path]);

    if (storageError) {
      console.error('删除 HTML 存储文件失败:', storageError);
    }

    // 清空数据库字段
    const { error: dbError } = await supabase
      .from('article_images')
      .update({ html_url: null, html_storage_path: null })
      .eq('id', imageId);

    if (dbError) throw dbError;

    return successResponse({ message: 'HTML 源文件已删除' });
  } catch (error: any) {
    console.error('删除 HTML 失败:', error);
    return errorResponse(error.message || '删除 HTML 失败', 500);
  }
});
