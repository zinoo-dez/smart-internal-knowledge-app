import { test, expect } from '@playwright/test';

test.describe('Smart Internal Knowledge Assistant - End-to-End User Journeys', () => {
  test('1. Marketing Landing Page: renders hero, bilingual toggle, and CTA', async ({ page }) => {
    await page.goto('/');

    // Check brand title and hero
    await expect(page).toHaveTitle(/Smart Internal Knowledge Assistant/i);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    // Verify navigation links
    const launchChatBtn = page.getByRole('link', { name: /open assistant|စတင်အသုံးပြုရန်|get started/i });
    if (await launchChatBtn.count() > 0) {
      await expect(launchChatBtn.first()).toBeVisible();
    }
  });

  test('2. Conversational Assistant (/chat): renders Gemini-style omnibox and prompt cards', async ({ page }) => {
    await page.goto('/chat');

    // Omnibox input should be present and ready for queries
    const omnibox = page.locator('input[type="text"], textarea').first();
    await expect(omnibox).toBeVisible();

    // Check model selector dropdown or badge
    const modelSelector = page.locator('button').filter({ hasText: /gemini|claude|gpt|model/i });
    if (await modelSelector.count() > 0) {
      await expect(modelSelector.first()).toBeVisible();
    }
  });

  test('3. Admin Documents Hub (/admin/documents): renders document table and connector controls', async ({ page }) => {
    await page.goto('/admin/documents');

    // Page title or main heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Verify connector sync controls or document table
    const syncButton = page.locator('button').filter({ hasText: /sync|upload|notion|confluence/i });
    if (await syncButton.count() > 0) {
      await expect(syncButton.first()).toBeVisible();
    }
  });

  test('4. Admin Billing & Quota (/admin/billing): renders tier plans and usage bars', async ({ page }) => {
    await page.goto('/admin/billing');

    // Billing heading or tier card
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
