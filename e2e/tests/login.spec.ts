import { test, expect } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USER } from '../support/constants';

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-submit')).toBeVisible();
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill('wrong-password');
    await page.locator('#login-submit').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('logs in with valid admin credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-username').fill(ADMIN_USER);
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('#login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
