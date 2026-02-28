import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const testEmail = `user${timestamp}@decp.app`;
  const testPassword = 'Password123!';

  test('should register a new student user and redirect to feed', async ({ page }) => {
    await page.goto('/register');
    
    // Fill the registration form
    await page.fill('input[placeholder="John Doe"]', `Test User ${timestamp}`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Choose Student role
    await page.getByRole('button', { name: 'Student' }).click();
    
    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Expect to land on Feed page
    await expect(page).toHaveURL(/\/feed/);
    
    // Verify the user name is in the sidebar
    await expect(page.locator('.sidebar')).toContainText(`Test User ${timestamp}`);
  });

  test('should login with existing credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alumni@decp.app');
    await page.fill('input[type="password"]', 'Alumni@123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.locator('.sidebar')).toContainText('alumni');
  });
});
