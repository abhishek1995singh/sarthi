import { test, expect } from '@playwright/test';
import { ROUTES } from '../support/constants';

const navCases: Array<{ label: string; path: string }> = [
  { label: 'Dashboard', path: ROUTES.dashboard },
  { label: 'Purchase', path: ROUTES.purchase },
  { label: 'Sale', path: ROUTES.sale },
  { label: 'Cash Book', path: ROUTES.cashbook },
  { label: 'Ledger', path: ROUTES.ledger },
  { label: 'Bardana', path: ROUTES.bardana },
  { label: 'Party Master', path: ROUTES.parties },
  { label: 'Commodities', path: ROUTES.commodities },
  { label: 'Reports', path: ROUTES.reports },
  { label: 'Settings', path: ROUTES.settings },
];

test.describe('Shell navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await expect(page).toHaveURL(new RegExp(ROUTES.dashboard));
  });

  for (const { label, path } of navCases) {
    test(`navigates to ${label}`, async ({ page }) => {
      await page.getByRole('link', { name: label, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
    });
  }

  test('signs out back to login', async ({ page }) => {
    await page.locator('.user-info').click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
