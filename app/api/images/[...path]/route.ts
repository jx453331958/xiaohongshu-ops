import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
};

function getMimeType(filename: string, blobType?: string): string {
  if (blobType && blobType !== 'application/octet-stream') return blobType;
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

/**
 * GET /api/images/:path - 从 Supabase Storage 获取文件（图片 / HTML）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join('/');
  
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase.storage
    .from('article-images')
    .download(fullPath);

  if (error || !data) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  const headers = new Headers();
  const filename = path[path.length - 1] || 'file';
  headers.set('Content-Type', getMimeType(filename, data.type));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  const download = req.nextUrl.searchParams.get('download');
  if (download === '1') {
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  }

  return new NextResponse(data, { headers });
}
