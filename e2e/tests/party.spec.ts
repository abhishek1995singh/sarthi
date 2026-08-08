import { test, expect } from '@playwright/test';
import { ROUTES } from '../support/constants';
import { createParty } from '../support/ui';
import { uniqueLabel } from '../support/test-data';

test.describe('Party master', () => {
  test('creates an aadhti party and finds it via search', async ({ page }) => {
    const partyName = uniqueLabel('E2E Aadhti');

    await createParty(page, {
      name: partyName,
      type: 'AADHTI',
      contactPerson: 'Test Contact',
      phone: '9876543210',
    });

    await page.locator('#search-party').fill(partyName);
    await expect(page.locator('.party-table .party-name', { hasText: partyName })).toBeVisible();
    await expect(page.getByText('Aadhti').first()).toBeVisible();
  });

  test('filters parties by type', async ({ page }) => {
    const partyName = uniqueLabel('E2E Buyer');

    await createParty(page, { name: partyName, type: 'BUYER' });
    await page.locator('#filter-BUYER').click();
    await page.locator('#search-party').fill(partyName);
    await expect(page.locator('.party-table .party-name', { hasText: partyName })).toBeVisible();

    await page.locator('#filter-AADHTI').click();
    await expect(page.locator('.party-table .party-name', { hasText: partyName })).toHaveCount(0);
  });

  test('requires name and type before save is enabled', async ({ page }) => {
    await page.goto(ROUTES.parties);
    await page.locator('#btn-add-party, #btn-add-party-mobile').first().click();
    await expect(page.locator('#party-save')).toBeDisabled();
    await page.locator('#party-name').fill('Incomplete Party');
    await expect(page.locator('#party-save')).toBeDisabled();
    await page.locator('.type-option[data-type="BUYER"]').click();
    await expect(page.locator('#party-save')).toBeEnabled();
  });
});
