import { test, expect } from '@playwright/test';

test.describe('User Profiles and Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student@decp.app');
    await page.fill('input[type="password"]', 'Student@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/feed/);
  });

  test('should load the personal profile and enable editing', async ({ page }) => {
    await page.goto('/profile');
    
    // Verify an 'Edit' button exists natively
    await expect(page.locator('button', { hasText: 'Edit' })).toBeVisible();
  });

  test('should load the notification center', async ({ page }) => {
    await page.goto('/notifications');
    // We expect clear layouts with 'Mark all' triggers
    await expect(page.locator('h2', { hasText: 'Notifications' })).toBeVisible();
    
    const hasNotifs = await page.isVisible('.neu-card-sm.hover-lift');
    const noNotifs = await page.getByText('No notifications yet').isVisible();
    expect(hasNotifs || noNotifs).toBeTruthy();
  });
});
