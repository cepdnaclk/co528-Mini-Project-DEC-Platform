import { test, expect } from '@playwright/test';

test.describe('Feed and Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test as the alumni test user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alumni@decp.app');
    await page.fill('input[type="password"]', 'Alumni@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/feed/);
  });

  test('should create a new post and render it', async ({ page }) => {
    const postText = `Playwright E2E Test Post ${Date.now()}`;
    await page.getByPlaceholder("What's on your mind?").fill(postText);
    await page.getByRole('button', { name: 'Post' }).click();
    
    // Expect the post to appear in the feed
    await expect(page.locator('text=' + postText)).toBeVisible({ timeout: 10000 });
  });
});
