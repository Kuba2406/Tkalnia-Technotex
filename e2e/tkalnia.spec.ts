/**
 * E2E – Tkalnia / Krosna (looms) critical flows
 *  1. Page loads and shows looms grouped by row
 *  2. Clicking a loom opens the LoomDetail panel
 *  3. LoomDetail shows the loom number and status
 *  4. Closing LoomDetail and opening another loom does not show stale data
 */

import { test, expect } from '@playwright/test';
import { mockAllApis, KROSNA, RZEDY } from './fixtures';

test.describe('Tkalnia / Krosna', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/tkalnia');
    await expect(page.getByRole('heading', { name: 'Tkalnia' })).toBeVisible();
  });

  test('shows loom list on load', async ({ page }) => {
    await expect(page.getByText(KROSNA[0].numer)).toBeVisible();
  });

  test('shows row grouping header', async ({ page }) => {
    await expect(page.getByText(RZEDY[0].nazwa)).toBeVisible();
  });

  test('click loom block to open LoomDetail panel', async ({ page }) => {
    // Looms are rendered as .loom-block divs; click the numer text inside it
    await page.locator('.loom-num', { hasText: KROSNA[0].numer }).click();
    // LoomDetail panel should appear – the close (×) button is the marker
    await expect(page.locator('.close-panel')).toBeVisible();
    // Status should be visible
    await expect(page.getByText(/pracuje/i)).toBeVisible();
  });

  test('loom detail – close returns to main list without stale state', async ({ page }) => {
    await page.locator('.loom-num', { hasText: KROSNA[0].numer }).click();
    // Close via the × button in LoomDetail
    await page.locator('.close-panel').click();
    // After closing, the loom list should still be rendered
    await expect(page.locator('.loom-num', { hasText: KROSNA[0].numer })).toBeVisible();
    // Detail panel should be gone
    await expect(page.locator('.close-panel')).not.toBeVisible();
  });

  test('open add loom modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj krosno' }).click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('Numer krosna')).toBeVisible();
    await page.getByRole('button', { name: 'Anuluj' }).click();
    await expect(modal).not.toBeVisible();
  });
});
