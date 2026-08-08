import { test, expect } from '@playwright/test';
import { ROUTES } from '../support/constants';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.dashboard);
  });

  test('loads today summary metrics', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.metrics .metric').first()).toBeVisible({ timeout: 15_000 });
  });

  test('quick actions link to transaction pages', async ({ page }) => {
    await page.locator('#quick-new-purchase').click();
    await expect(page).toHaveURL(/\/purchase/);

    await page.goto(ROUTES.dashboard);
    await page.locator('#quick-new-sale').click();
    await expect(page).toHaveURL(/\/sale/);
  });
});

test.describe('Reports', () => {
  test('runs cash flow report for current month', async ({ page }) => {
    await page.goto(ROUTES.reports);
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'This month' }).click();
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.locator('.reports-page')).toBeVisible();
  });
});
