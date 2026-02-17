import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/images/:bucket/:path - 从 Supabase Storage 获取图片
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join('/');
  
  const supabase = getServiceSupabase();
  
  // 尝试从 article-images bucket 获取
  const { data, error } = await supabase.storage
    .from('article-images')
    .download(fullPath);

  if (error || !data) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', data.type || 'image/png');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(data, { headers });
}
