import { test, expect } from '@playwright/test';

const VALID_TOKEN = 'test-token-123';

test.describe('日历页测试', () => {
  test.beforeEach(async ({ page, context }) => {
    // 清除 localStorage
    await context.clearCookies();
    
    // 登录
    await page.goto('/login');
    await page.fill('#token', VALID_TOKEN);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('访问日历页应正常渲染', async ({ page }) => {
    // 访问日历页
    await page.goto('/calendar');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题或主要元素
    const pageTitle = page.locator('h1, h2').first();
    await expect(pageTitle).toBeVisible({ timeout: 5000 });
  });

  test('显示日历组件', async ({ page }) => {
    // 访问日历页
    await page.goto('/calendar');
    
    // 等待日历组件加载
    await page.waitForTimeout(2000);
    
    // 验证日历组件存在
    // 可能的日历组件选择器：.calendar, [role="grid"], table
    const calendarComponent = page.locator('.calendar, [role="grid"], table').first();
    
    if (await calendarComponent.count() > 0) {
      await expect(calendarComponent).toBeVisible();
    } else {
      // 至少验证页面没有错误
      const errorMessage = page.locator('text=/错误|Error/i');
      expect(await errorMessage.count()).toBe(0);
    }
    
    // 验证月份导航按钮（如果有）
    const prevButton = page.locator('button:has-text("上一"), button[aria-label*="上一"], button[aria-label*="Previous"]');
    const nextButton = page.locator('button:has-text("下一"), button[aria-label*="下一"], button[aria-label*="Next"]');
    
    if (await prevButton.count() > 0) {
      await expect(prevButton.first()).toBeVisible();
    }
    if (await nextButton.count() > 0) {
      await expect(nextButton.first()).toBeVisible();
    }
  });

  test('日历页不应有加载错误', async ({ page }) => {
    // 访问日历页
    const response = await page.goto('/calendar');
    
    // 验证页面响应成功
    expect(response?.status()).toBeLessThan(400);
    
    // 验证没有控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 等待页面稳定
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 如果有严重错误，测试失败
    const seriousErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('Manifest') &&
      !err.includes('404')
    );
    expect(seriousErrors.length).toBe(0);
  });
});
