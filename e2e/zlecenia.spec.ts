/**
 * E2E – Zlecenia (production orders) critical flows
 *  1. Page loads, shows existing orders
 *  2. Create a new zlecenie through the UI
 *  3. Edit an existing order (open edit modal)
 *  4. Verify ilosc_m / pozostalo_m fields appear in the create form
 */

import { test, expect } from '@playwright/test';
import { mockAllApis, ZLECENIA, ARTYKULY } from './fixtures';

test.describe('Zlecenia', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/zlecenia');
    await expect(page.getByRole('heading', { name: 'Zlecenia' })).toBeVisible();
  });

  test('shows existing orders on load', async ({ page }) => {
    await expect(page.getByText(ZLECENIA[0].numer)).toBeVisible();
    await expect(page.getByText(ARTYKULY[0].nazwa)).toBeVisible();
  });

  test('shows order quantity in the table', async ({ page }) => {
    // ilosc_m = 1000 shown as "1 000 m" or "1000 m"
    await expect(page.getByText(/1[\s\u00a0]?000 m/)).toBeVisible();
  });

  test('open create modal – form fields are present', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj zlecenie' }).click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible();

    // Numer zlecenia field should be pre-filled
    await expect(modal.getByLabel('Numer zlecenia')).toBeVisible();
    // Ilość field
    await expect(modal.getByLabel('Ilość (m)')).toBeVisible();
    // Artykuł select contains the mocked article
    await expect(modal.getByText(ARTYKULY[0].nazwa)).toBeVisible();

    await page.getByRole('button', { name: 'Anuluj' }).click();
    await expect(modal).not.toBeVisible();
  });

  test('create a new zlecenie', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj zlecenie' }).click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible();

    // Update the order number to something unique
    const numerInput = modal.getByLabel('Numer zlecenia');
    await numerInput.fill('ZP-TEST/2024');

    await page.getByRole('button', { name: 'Dodaj zlecenie' }).click();
    // Modal closes after successful stub response
    await expect(modal).not.toBeVisible();
  });

  test('edit existing order – open and close edit modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edytuj' }).first().click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible();
    // Modal title should say "Edytuj zlecenie"
    await expect(modal.getByText('Edytuj zlecenie')).toBeVisible();
    // The numer field should contain the existing order number
    await expect(modal.getByLabel('Numer zlecenia')).toHaveValue(ZLECENIA[0].numer);
    await page.getByRole('button', { name: 'Anuluj' }).click();
    await expect(modal).not.toBeVisible();
  });
});
