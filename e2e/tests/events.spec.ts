import { test, expect } from '@playwright/test';

test.describe('Events Board Flow', () => {
  test('should allow a student to view events and RSVP', async ({ page }) => {
    // 1. Login as Student
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student@decp.app');
    await page.fill('input[type="password"]', 'Student@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/feed/);

    // 2. Navigate to Events
    await page.goto('/events');
    
    // 3. Verify the grid layout loads
    // Wait for either the grid to populate or the empty state to appear
    await expect(page.locator('.grid-cols-3 .neu-card').first().or(page.locator('text=No events'))).toBeVisible({ timeout: 10000 });
    const hasEvents = await page.isVisible('.grid-cols-3 .neu-card');

    // 4. Test RSVP
    if (hasEvents) {
      const rsvpBtn = page.locator('button', { hasText: 'RSVP' }).first();
      await rsvpBtn.click();
    }
  });
});
