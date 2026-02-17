import { test, expect } from '@playwright/test';

const VALID_TOKEN = 'test-token-123';
const INVALID_TOKEN = 'wrong-token';

test.describe('认证测试', () => {
  test.beforeEach(async ({ context }) => {
    // 每个测试前清除 localStorage
    await context.clearCookies();
  });

  test('访问首页应跳转到登录页', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('输入错误 token 应提示错误', async ({ page }) => {
    await page.goto('/login');
    
    // 填写错误的 token
    await page.fill('#token', INVALID_TOKEN);
    
    // 监听 alert 弹窗
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Token 无效');
      dialog.accept();
    });
    
    // 点击登录
    await page.click('button[type="submit"]');
    
    // 等待错误提示
    await page.waitForTimeout(1000);
    
    // 验证仍在登录页
    await expect(page).toHaveURL('/login');
  });

  test('输入正确 token 应跳转到 dashboard', async ({ page }) => {
    await page.goto('/login');
    
    // 填写正确的 token
    await page.fill('#token', VALID_TOKEN);
    
    // 点击登录
    await page.click('button[type="submit"]');
    
    // 等待跳转到 dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // 验证页面加载成功
    await expect(page.locator('body')).toBeVisible();
  });

  test('登录后刷新页面应保持登录状态', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.fill('#token', VALID_TOKEN);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // 刷新页面
    await page.reload();
    
    // 验证仍在 dashboard，未跳转到登录页
    await expect(page).toHaveURL('/dashboard');
  });
});
