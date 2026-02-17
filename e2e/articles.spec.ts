import { test, expect } from '@playwright/test';

const VALID_TOKEN = 'test-token-123';

test.describe('文章 CRUD 测试', () => {
  let articleId: string;

  test.beforeEach(async ({ page, context }) => {
    // 清除 localStorage
    await context.clearCookies();
    
    // 登录
    await page.goto('/login');
    await page.fill('#token', VALID_TOKEN);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('创建新文章', async ({ page }) => {
    // 导航到文章列表
    await page.goto('/articles');
    
    // 点击"新建文章"按钮
    await page.click('text=新建文章');
    
    // 填写文章信息
    await page.fill('input[name="title"], input[placeholder*="标题"]', 'E2E 测试文章标题');
    
    // 等待编辑器加载并填写内容
    await page.waitForSelector('.w-md-editor-text, textarea', { timeout: 5000 });
    const editor = page.locator('.w-md-editor-text, textarea').first();
    await editor.fill('# E2E 测试内容\n\n这是通过 Playwright 创建的测试文章。');
    
    // 填写标签（如果有标签输入框）
    const tagInput = page.locator('input[placeholder*="标签"]');
    if (await tagInput.count() > 0) {
      await tagInput.fill('测试,e2e');
    }
    
    // 保存文章
    await page.click('button:has-text("保存"), button:has-text("创建")');
    
    // 等待跳转或成功提示
    await page.waitForTimeout(2000);
    
    // 从 URL 或页面获取文章 ID
    const url = page.url();
    const match = url.match(/\/articles\/([a-f0-9-]+)/);
    if (match) {
      articleId = match[1];
    }
  });

  test('文章列表应显示刚创建的文章', async ({ page }) => {
    await page.goto('/articles');
    
    // 等待表格加载
    await page.waitForSelector('table', { timeout: 10000 });
    
    // 搜索刚创建的文章
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('E2E 测试文章标题');
      await page.waitForTimeout(1000);
    }
    
    // 验证文章出现在列表中
    await expect(page.locator('text=E2E 测试文章标题')).toBeVisible();
  });

  test('编辑文章内容', async ({ page, request }) => {
    // 先通过 API 创建一篇文章
    const response = await request.post('http://localhost:3000/api/articles', {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 编辑测试文章',
        content: '初始内容',
        tags: ['测试'],
      },
    });
    const article = await response.json();
    articleId = article.id;
    
    // 访问文章编辑页
    await page.goto(`/articles/${articleId}`);
    
    // 等待编辑器加载
    await page.waitForSelector('.w-md-editor-text, textarea', { timeout: 5000 });
    
    // 修改内容
    const editor = page.locator('.w-md-editor-text, textarea').first();
    await editor.clear();
    await editor.fill('# 更新后的内容\n\n这是编辑后的文章内容。');
    
    // 保存
    await page.click('button:has-text("保存"), button:has-text("更新")');
    
    // 等待保存完成
    await page.waitForTimeout(2000);
    
    // 验证内容已更新（可以刷新页面）
    await page.reload();
    await page.waitForSelector('.w-md-editor-text, textarea', { timeout: 5000 });
    const updatedContent = await page.locator('.w-md-editor-text, textarea').first().inputValue();
    expect(updatedContent).toContain('更新后的内容');
  });

  test('查看版本历史应有记录', async ({ page, request }) => {
    // 先创建文章
    const response = await request.post('http://localhost:3000/api/articles', {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 版本测试文章',
        content: 'v1 内容',
      },
    });
    const article = await response.json();
    articleId = article.id;
    
    // 更新文章（生成 v2）
    await request.put(`http://localhost:3000/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        content: 'v2 内容',
      },
    });
    
    // 访问版本历史页面
    await page.goto(`/articles/${articleId}/versions`);
    
    // 验证至少有 2 个版本
    await page.waitForSelector('text=版本', { timeout: 5000 });
    const versionElements = await page.locator('text=/版本 [0-9]+/').count();
    expect(versionElements).toBeGreaterThanOrEqual(2);
  });

  test('更改文章状态（draft → pending_render → pending_review）', async ({ page, request }) => {
    // 创建文章
    const response = await request.post('http://localhost:3000/api/articles', {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 状态测试文章',
        content: '测试内容',
      },
    });
    const article = await response.json();
    articleId = article.id;
    
    // 访问文章详情页
    await page.goto(`/articles/${articleId}`);
    
    // 找到状态选择器或按钮
    const statusSelect = page.locator('select, [role="combobox"]').first();
    
    // draft -> pending_render
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('pending_render');
      await page.waitForTimeout(1000);
    }
    
    // pending_render -> pending_review
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('pending_review');
      await page.waitForTimeout(1000);
    }
    
    // 验证状态已更改（可以通过 API 确认）
    const statusResponse = await request.get(`http://localhost:3000/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
      },
    });
    const updatedArticle = await statusResponse.json();
    expect(['pending_render', 'pending_review']).toContain(updatedArticle.status);
  });

  test('删除文章', async ({ page, request }) => {
    // 创建文章
    const response = await request.post('http://localhost:3000/api/articles', {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'E2E 删除测试文章',
        content: '将被删除的文章',
      },
    });
    const article = await response.json();
    articleId = article.id;
    
    // 访问文章详情页
    await page.goto(`/articles/${articleId}`);
    
    // 找到删除按钮
    const deleteButton = page.locator('button:has-text("删除")');
    
    // 监听确认对话框
    page.once('dialog', dialog => {
      dialog.accept();
    });
    
    // 点击删除
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // 等待跳转到文章列表
      await page.waitForTimeout(2000);
      
      // 验证已跳转
      expect(page.url()).toContain('/articles');
    }
    
    // 验证文章已删除（通过 API）
    const verifyResponse = await request.get(`http://localhost:3000/api/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
      },
    });
    expect(verifyResponse.status()).toBe(404);
  });
});
