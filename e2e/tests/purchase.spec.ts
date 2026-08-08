import { test, expect } from '@playwright/test';
import { ROUTES } from '../support/constants';
import {
  confirmDraftPurchase,
  createParty,
  expectPurchaseInTable,
  postPurchasePayment,
  recordPurchaseDraft,
} from '../support/ui';
import { uniqueLabel } from '../support/test-data';

test.describe.serial('Purchase flow', () => {
  const partyName = uniqueLabel('E2E Supplier');

  test('creates supplier party for purchase', async ({ page }) => {
    await createParty(page, { name: partyName, type: 'AADHTI' });
  });

  test('records a draft purchase', async ({ page }) => {
    await recordPurchaseDraft(page, { partyName });
    const row = await expectPurchaseInTable(page, partyName);
    await expect(row.locator('[data-status="DRAFT"]')).toBeVisible();
  });

  test('confirms draft and adds stock', async ({ page }) => {
    await page.goto(ROUTES.purchase);
    await page.getByRole('button', { name: /^All\b/i }).click();
    await confirmDraftPurchase(page, partyName);
    const row = await expectPurchaseInTable(page, partyName);
    await expect(row.locator('[data-status="DRAFT"]')).toHaveCount(0);
    await expect(row.locator('[data-status="UNPAID"]')).toBeVisible();
  });

  test('posts payment against confirmed purchase', async ({ page }) => {
    await page.goto(ROUTES.purchase);
    await postPurchasePayment(page, partyName);
    const row = await expectPurchaseInTable(page, partyName);
    await expect(row.locator('[data-status="PAID"]')).toBeVisible();
  });
});
