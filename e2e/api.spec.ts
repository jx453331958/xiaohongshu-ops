import { test, expect } from '@playwright/test';

const API_TOKEN = 'test-token-123';
const BASE_URL = 'http://localhost:3000';

test.describe('API 接口测试', () => {
  let articleId: string;

  test('GET /api/articles 无 token 应返回 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/articles`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/articles 创建文章', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/articles`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 测试文章',
        content: '这是测试内容',
        tags: ['测试', 'e2e'],
        category: '技术',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.title).toBe('E2E 测试文章');
    expect(data.status).toBe('draft');
    articleId = data.id;
  });

  test('GET /api/articles/:id 获取文章详情', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(articleId);
    expect(data.title).toBe('E2E 测试文章');
  });

  test('PUT /api/articles/:id 更新文章', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 测试文章（已更新）',
        content: '更新后的内容',
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('E2E 测试文章（已更新）');
    expect(data.content).toBe('更新后的内容');
  });

  test('GET /api/articles/:id/versions 获取版本历史', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/articles/${articleId}/versions`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.versions).toHaveLength(2); // 创建时 v1，更新时 v2
  });

  test('PUT /api/articles/:id/status 状态流转', async ({ request }) => {
    // draft -> pending_render
    const response1 = await request.put(`${BASE_URL}/api/articles/${articleId}/status`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: { status: 'pending_render' },
    });
    expect(response1.status()).toBe(200);

    // pending_render -> pending_review
    const response2 = await request.put(`${BASE_URL}/api/articles/${articleId}/status`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: { status: 'pending_review' },
    });
    expect(response2.status()).toBe(200);
  });

  test('POST /api/articles/:id/images 上传图片', async ({ request }) => {
    // 创建测试图片
    const imageBuffer = Buffer.from('fake-image-data');
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test.png');
    formData.append('sort_order', '0');

    const response = await request.post(`${BASE_URL}/api/articles/${articleId}/images`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      multipart: {
        file: {
          name: 'test.png',
          mimeType: 'image/png',
          buffer: imageBuffer,
        },
        sort_order: '0',
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.article_id).toBe(articleId);
    expect(data.url).toContain('/uploads/');
  });

  test('DELETE /api/articles/:id 删除文章', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });

    expect(response.status()).toBe(200);

    // 验证文章已删除
    const getResponse = await request.get(`${BASE_URL}/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    expect(getResponse.status()).toBe(404);
  });
});
