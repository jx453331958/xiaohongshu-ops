/**
 * API 客户端工具函数
 */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth-storage')
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        headers['Authorization'] = `Bearer ${parsed.state.token}`;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || '请求失败');
  }

  return data;
}

export async function uploadFile(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<any> {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth-storage')
    : null;

  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {};

  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        headers['Authorization'] = `Bearer ${parsed.state.token}`;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || '上传失败');
  }

  return data;
}
