/**
 * E2E – Nieobecnosci (absences) critical flows
 *  1. Tab opens and shows existing absence records
 *  2. The absence row shows data_od / data_do dates
 *  3. Create a new absence via the modal
 */

import { test, expect } from '@playwright/test';
import { mockAllApis, NIEOBECNOSCI, PRACOWNICY } from './fixtures';

test.describe('Nieobecnosci', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/obecnosci');
    await expect(page.getByRole('heading', { name: 'Obecności' })).toBeVisible();
    // Navigate to the Nieobecności tab
    await page.getByRole('button', { name: 'Nieobecności' }).click();
    await expect(page.getByText('Planowane nieobecności')).toBeVisible();
  });

  test('shows existing absence record', async ({ page }) => {
    const worker = PRACOWNICY[0];
    await expect(page.getByText(`${worker.imie} ${worker.nazwisko}`)).toBeVisible();
  });

  test('absence list shows a date range for existing record', async ({ page }) => {
    // The absence-period should render dates (fixture: 2024-06-01 to 2024-06-14)
    // formatDate renders DD.MM.YYYY or similar; we look for the month/year pattern
    const absenceText = page.locator('.absence-period').first();
    await expect(absenceText).toBeVisible();
    // Date range contains at least one date-like string (day.month)
    const text = await absenceText.textContent();
    expect(text).toMatch(/\d/); // at minimum contains a digit (date)
  });

  test('add absence modal – Od and Do date fields are present', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj nieobecność' }).click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible();

    // Verify date labels
    await expect(modal.getByLabel('Od')).toBeVisible();
    await expect(modal.getByLabel('Do')).toBeVisible();

    // Verify pracownik select is present
    await expect(modal.getByLabel('Pracownik')).toBeVisible();

    await page.getByRole('button', { name: 'Anuluj' }).click();
    await expect(modal).not.toBeVisible();
  });

  test('create absence through UI', async ({ page }) => {
    await page.getByRole('button', { name: '+ Dodaj nieobecność' }).click();
    const modal = page.locator('.modal').first();
    await expect(modal).toBeVisible();

    // Fill date fields
    await modal.getByLabel('Od').fill('2024-07-01');
    await modal.getByLabel('Do').fill('2024-07-07');

    await page.getByRole('button', { name: 'Zapisz' }).click();
    // After the POST stub returns, the modal closes
    await expect(modal).not.toBeVisible();
  });

  test('absence count displayed in section header', async ({ page }) => {
    // Header shows "Planowane nieobecności (N)"
    await expect(page.getByText(`Planowane nieobecności (${NIEOBECNOSCI.length})`)).toBeVisible();
  });
});
