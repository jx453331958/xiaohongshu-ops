const API_BASE_URL =
  process.env.XHS_API_BASE_URL || "http://localhost:3001/api";
const API_AUTH_TOKEN = process.env.XHS_API_AUTH_TOKEN || "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_AUTH_TOKEN}`,
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || `API 请求失败 (${response.status})`,
    );
  }

  return data as T;
}

export function formatResult(data: unknown): {
  content: [{ type: "text"; text: string }];
} {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function formatError(error: unknown): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  const message =
    error instanceof ApiError
      ? `API 错误 (${error.status}): ${error.message}`
      : `请求失败: ${error instanceof Error ? error.message : String(error)}`;
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
