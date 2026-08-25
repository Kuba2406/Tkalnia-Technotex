/**
 * E2E – Obecnosci (attendance) tab switching
 *  1. Page loads on the Pracownicy tab by default
 *  2. Switching to each tab renders without runtime errors
 *  3. The Nieobecności tab shows the absence section
 *  4. The Kalendarz tab renders the calendar component
 */

import { test, expect } from '@playwright/test';
import { mockAllApis } from './fixtures';

test.describe('Obecnosci – tab switching', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/obecnosci');
    await expect(page.getByRole('heading', { name: 'Obecności' })).toBeVisible();
  });

  test('default tab is Pracownicy', async ({ page }) => {
    // The Pracownicy tab should be active by default
    const activeTab = page.locator('.tab-btn.active');
    await expect(activeTab).toHaveText('Pracownicy');
  });

  test('switch to Plan zmian tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Plan zmian' }).click();
    const activeTab = page.locator('.tab-btn.active');
    await expect(activeTab).toHaveText('Plan zmian');
  });

  test('switch to Obecność dzienna tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Obecność dzienna' }).click();
    const activeTab = page.locator('.tab-btn.active');
    await expect(activeTab).toHaveText('Obecność dzienna');
    // The heading/section should be visible
    await expect(page.getByText(/obecność dzienna|lista obecności/i).first()).toBeVisible();
  });

  test('switch to Nieobecności tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Nieobecności' }).click();
    const activeTab = page.locator('.tab-btn.active');
    await expect(activeTab).toHaveText('Nieobecności');
    await expect(page.getByText('Planowane nieobecności')).toBeVisible();
  });

  test('switch to Kalendarz tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Kalendarz' }).click();
    const activeTab = page.locator('.tab-btn.active');
    await expect(activeTab).toHaveText('Kalendarz');
    // The calendar component renders navigation buttons (‹ and ›)
    await expect(page.getByRole('button', { name: '‹' }).first()).toBeVisible();
  });

  test('switching tabs multiple times does not crash the page', async ({ page }) => {
    const tabs = ['Plan zmian', 'Obecność dzienna', 'Nieobecności', 'Pracownicy', 'Kalendarz'];
    for (const label of tabs) {
      await page.getByRole('button', { name: label }).click();
      await page.waitForTimeout(100); // allow React re-render
    }
    // Page should still be functional
    await expect(page.getByRole('heading', { name: 'Obecności' })).toBeVisible();
  });
});
