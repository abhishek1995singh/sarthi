import { Page, expect } from '@playwright/test';
import { ROUTES } from './constants';

export async function acceptNextDialog(page: Page) {
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
}

export async function selectMatOption(page: Page, selectSelector: string, optionLabel: string) {
  await page.locator(selectSelector).click();
  const overlay = page.locator('.cdk-overlay-container');
  await overlay.getByRole('option', { name: optionLabel, exact: true }).click();
}

export async function openAddPartyForm(page: Page) {
  await page.goto(ROUTES.parties);
  await expect(page.getByRole('heading', { name: 'Party Master', level: 1 })).toBeVisible();
  await page.locator('#btn-add-party, #btn-add-party-mobile').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export interface CreatePartyInput {
  name: string;
  type?: 'AADHTI' | 'BUYER' | 'MILL' | 'TRANSPORTER';
  contactPerson?: string;
  phone?: string;
}

export async function createParty(page: Page, input: CreatePartyInput) {
  await openAddPartyForm(page);
  await page.locator('#party-name').fill(input.name);
  await page.locator(`.type-option[data-type="${input.type ?? 'AADHTI'}"]`).click();

  if (input.contactPerson) {
    await page.locator('#party-contact').fill(input.contactPerson);
  }
  if (input.phone) {
    await page.locator('#party-phone').fill(input.phone);
  }

  await page.locator('#party-save').click();
  await expect(page.getByText('Party created successfully')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.locator('#search-party').fill(input.name);
  await expect(page.locator('.party-table .party-name', { hasText: input.name })).toBeVisible();
}

export interface RecordPurchaseInput {
  partyName: string;
  commodity?: string;
  variety?: string;
  weightQuintals?: string;
  ratePerQuintal?: string;
}

export async function openRecordPurchaseForm(page: Page) {
  await page.goto(ROUTES.purchase);
  await expect(page.getByRole('heading', { name: 'Purchase', level: 1 })).toBeVisible();
  await page.locator('#btn-add-purchase, #btn-add-purchase-mobile').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function recordPurchaseDraft(page: Page, input: RecordPurchaseInput) {
  const {
    partyName,
    commodity = 'Paddy',
    variety = '1509 Hand',
    weightQuintals = '10',
    ratePerQuintal = '2500',
  } = input;

  await openRecordPurchaseForm(page);
  await selectMatOption(page, '#purchase-party', partyName);
  await selectMatOption(page, '#purchase-commodity', commodity);
  await page.locator('#purchase-variety').click();
  await page.locator('.cdk-overlay-container').getByRole('option', { name: variety, exact: true }).click();
  await page.locator('#purchase-weight').fill(weightQuintals);
  await page.locator('#purchase-rate').fill(ratePerQuintal);
  await expect(page.locator('.billing-summary')).toBeVisible();
  await page.locator('#purchase-save').click();
  await expect(page.getByText('Purchase recorded as Draft successfully')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
}

export async function confirmDraftPurchase(page: Page, partyName: string) {
  await page.locator('#search-purchase').fill(partyName);
  acceptNextDialog(page);
  const row = page.locator('.purchase-table tr').filter({ hasText: partyName }).first();
  await row.locator('[id^="purchase-action-"]').click();
  await page.getByRole('menuitem', { name: /Confirm & Add Stock/i }).click();
  await expect(page.getByText('Purchase confirmed & stock updated')).toBeVisible();
}

export async function postPurchasePayment(page: Page, partyName: string) {
  await page.locator('#search-purchase').fill(partyName);
  const row = page.locator('.purchase-table tr').filter({ hasText: partyName }).first();
  await row.locator('[id^="purchase-action-"]').click();
  await page.getByRole('menuitem', { name: /Record Payment/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Post Payment' }).click();
  await expect(page.getByText('Payment posted to cash book & ledger')).toBeVisible();
}

export async function expectPurchaseInTable(page: Page, partyName: string) {
  await page.locator('#search-purchase').fill(partyName);
  const row = page.locator('.purchase-table tr').filter({ hasText: partyName }).first();
  await expect(row.locator('.party-name', { hasText: partyName })).toBeVisible();
  return row;
}
