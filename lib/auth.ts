import { NextRequest, NextResponse } from 'next/server';

/**
 * 验证 Bearer token
 */
export function verifyToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const validToken = process.env.API_AUTH_TOKEN;
  
  return token === validToken;
}

/**
 * 认证中间件包装器
 */
export function withAuth(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    if (!verifyToken(req)) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }
    
    return handler(req, context);
  };
}

/**
 * API 错误响应
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * API 成功响应
 */
export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
