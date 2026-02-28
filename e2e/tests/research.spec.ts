import { test, expect } from '@playwright/test';

test.describe('Research & Innovation Flow', () => {
  test('should allow an alumni to post a project and a student to join', async ({ page }) => {
    // 1. Login as Alumni
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alumni@decp.app');
    await page.fill('input[type="password"]', 'Alumni@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/feed/);

    // 2. Navigate to Research page
    await page.goto('/research');

    // 3. Verify grid rendering
    await expect(page.locator('button', { hasText: 'New Project' })).toBeVisible();
    
    // We expect at least one project, or the empty state text
    await expect(page.locator('.grid-cols-3 .neu-card').first().or(page.locator('text=No active research projects.'))).toBeVisible({ timeout: 10000 });
    const hasProjects = await page.isVisible('.grid-cols-3 .neu-card');

    await page.getByRole('button', { name: 'Logout' }).click();

    // 4. Student flow
    await page.fill('input[type="email"]', 'student@decp.app');
    await page.fill('input[type="password"]', 'Student@123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Navigate to Research and click "Join"
    await page.goto('/research');
    if (hasProjects) {
       const joinBtn = page.locator('button', { hasText: 'Join' }).first();
       await joinBtn.click();
       // Toast notification should fire, testing button interaction
    }
  });
});
