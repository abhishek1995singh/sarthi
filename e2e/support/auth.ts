import { Page, expect } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USER } from './constants';

export async function login(page: Page, username = ADMIN_USER, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.locator('#login-username').fill(username);
  await page.locator('#login-password').fill(password);
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(/\/dashboard/);
}
