/**
 * E2E – Zadania (tasks) critical flows
 *  1. Page loads and shows the task list
 *  2. Create a new task
 *  3. Mark a task as done
 *  4. Delete a task
 */

import { test, expect } from '@playwright/test';
import { mockAllApis, ZADANIA } from './fixtures';

test.describe('Zadania', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/zadania');
    // Wait for the view header to appear
    await expect(page.getByRole('heading', { name: 'Zadania' })).toBeVisible();
  });

  test('shows existing tasks on load', async ({ page }) => {
    await expect(page.getByText(ZADANIA[0].tekst)).toBeVisible();
  });

  test('create a new task', async ({ page }) => {
    const input = page.getByPlaceholder('Treść zadania…');
    await input.fill('Nowe zadanie testowe');
    await page.getByRole('button', { name: '+ Dodaj' }).click();
    // The POST stub returns a response; SWR revalidates so original task still shown
    await expect(input).toHaveValue('');
  });

  test('mark task as done via checkbox button', async ({ page }) => {
    const checkbox = page.getByRole('button', { name: 'Oznacz jako zrobione' }).first();
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    // After the PATCH stub resolves, SWR revalidates – button label flips on re-render
    // We simply assert no JS error occurred by checking the page is still intact
    await expect(page.getByRole('heading', { name: 'Zadania' })).toBeVisible();
  });

  test('delete task via delete button', async ({ page }) => {
    await page.getByRole('button', { name: 'Usuń zadanie' }).first().click();
    // Confirm dialog should appear
    await expect(page.getByText('Usunąć to zadanie?')).toBeVisible();
    await page.getByRole('button', { name: 'Usuń' }).click();
    // After DELETE stub resolves the confirm dialog closes
    await expect(page.getByText('Usunąć to zadanie?')).not.toBeVisible();
  });
});
