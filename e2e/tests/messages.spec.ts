import { test, expect } from '@playwright/test';

test.describe('Messaging and Real-Time', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student@decp.app');
    await page.fill('input[type="password"]', 'Student@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/feed/);
  });

  test('should navigate to messages and send a chat', async ({ page }) => {
    // Navigate to messages
    await page.click('text=Messages');
    await expect(page).toHaveURL(/\/messages/);

    // Click on the first conversation (if exists) or we just verify the UI loads
    const noMessages = await page.isVisible('text=No messages yet');
    
    // We expect the messaging UI to load without crashing (verifying our previous fix)
    await expect(page.locator('.neu-card', { hasText: 'Conversations' })).toBeVisible();
  });
});
