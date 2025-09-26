import { test, expect } from '@playwright/test';

const ENTRY_TITLE = 'テストアクティビティ';

test('日次エントリを登録して履歴に表示される', async ({ page }) => {
  await page.goto('/');

  const addButton = page.getByRole('button', { name: 'アクティビティを追加' });
  await addButton.click();

  await page.getByLabel('活動名 *').fill(ENTRY_TITLE);
  await page.getByLabel('メモ').fill('PlaywrightによるE2Eテスト');
  await page.getByRole('button', { name: '＋' }).first().click();
  await page.getByRole('button', { name: '保存する' }).click();

  await expect(page.getByText('入力を保存しました')).toBeVisible();

  await page.getByRole('button', { name: '履歴' }).click();
  await expect(page.getByRole('heading', { name: ENTRY_TITLE })).toBeVisible();
});
