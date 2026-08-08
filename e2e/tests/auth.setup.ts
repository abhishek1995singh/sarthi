import { test as setup } from '@playwright/test';
import { login } from '../support/auth';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate as admin', async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: authFile });
});
