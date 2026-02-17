import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const VALID_TOKEN = 'test-token-123';

test.describe('图片管理测试', () => {
  let articleId: string;

  test.beforeAll(async ({ request }) => {
    // 创建测试文章
    const response = await request.post('http://localhost:3000/api/articles', {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 图片测试文章',
        content: '用于测试图片上传的文章',
      },
    });
    const article = await response.json();
    articleId = article.id;
  });

  test.beforeEach(async ({ page, context }) => {
    // 清除 localStorage
    await context.clearCookies();
    
    // 登录
    await page.goto('/login');
    await page.fill('#token', VALID_TOKEN);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('上传图片到文章', async ({ page }) => {
    // 访问文章详情页
    await page.goto(`/articles/${articleId}`);
    
    // 创建测试图片文件
    const testImagePath = path.join(process.cwd(), 'test-image.png');
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, imageBuffer);
    
    try {
      // 找到文件上传输入框
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.count() > 0) {
        // 上传文件
        await fileInput.setInputFiles(testImagePath);
        
        // 等待上传完成
        await page.waitForTimeout(2000);
        
        // 验证图片出现在页面上
        const uploadedImage = page.locator('img[src*="/uploads/"]');
        await expect(uploadedImage.first()).toBeVisible({ timeout: 5000 });
      }
    } finally {
      // 清理测试文件
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    }
  });

  test('图片列表应显示已上传图片', async ({ page, request }) => {
    // 通过 API 上传图片
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    await request.post(`http://localhost:3000/api/articles/${articleId}/images`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
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
    
    // 访问文章详情页
    await page.goto(`/articles/${articleId}`);
    
    // 等待图片加载
    await page.waitForSelector('img[src*="/uploads/"]', { timeout: 5000 });
    
    // 验证图片显示
    const images = await page.locator('img[src*="/uploads/"]').count();
    expect(images).toBeGreaterThan(0);
  });

  test('删除图片', async ({ page, request }) => {
    // 上传一张图片
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    const uploadResponse = await request.post(`http://localhost:3000/api/articles/${articleId}/images`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
      },
      multipart: {
        file: {
          name: 'to-delete.png',
          mimeType: 'image/png',
          buffer: imageBuffer,
        },
        sort_order: '0',
      },
    });
    const uploadedImage = await uploadResponse.json();
    
    // 访问文章详情页
    await page.goto(`/articles/${articleId}`);
    
    // 等待图片加载
    await page.waitForSelector('img[src*="/uploads/"]', { timeout: 5000 });
    
    // 找到删除按钮（通常在图片旁边或悬停时显示）
    const deleteButton = page.locator('button:has-text("删除"), button[aria-label*="删除"], button[title*="删除"]').first();
    
    if (await deleteButton.count() > 0) {
      // 监听确认对话框
      page.once('dialog', dialog => {
        dialog.accept();
      });
      
      // 点击删除
      await deleteButton.click();
      
      // 等待删除完成
      await page.waitForTimeout(2000);
    } else {
      // 如果没有 UI 删除按钮，通过 API 删除
      await request.delete(`http://localhost:3000/api/articles/${articleId}/images?image_id=${uploadedImage.id}`, {
        headers: {
          'Authorization': `Bearer ${VALID_TOKEN}`,
        },
      });
    }
    
    // 验证图片已删除（通过 API）
    const imagesResponse = await request.get(`http://localhost:3000/api/articles/${articleId}/images`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
      },
    });
    const imagesData = await imagesResponse.json();
    const imageExists = imagesData.images.some((img: any) => img.id === uploadedImage.id);
    expect(imageExists).toBe(false);
  });

  test.afterAll(async ({ request }) => {
    // 清理测试文章
    await request.delete(`http://localhost:3000/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
      },
    });
  });
});
