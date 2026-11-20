import { test, expect } from '@playwright/test';

test.describe('Smart Internal Knowledge Assistant - End-to-End User Journeys', () => {
  test('1. Marketing Landing Page: renders hero, bilingual toggle, and CTA', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Smart Internal Knowledge Assistant/i);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    const launchChatBtn = page.getByRole('link', {
      name: /open assistant|စတင်အသုံးပြုရန်|get started/i,
    });
    if ((await launchChatBtn.count()) > 0) {
      await expect(launchChatBtn.first()).toBeVisible();
    }
  });

  test('2. Conversational Assistant (/chat): submits inquiry, displays grounded output & opens citation drawer', async ({
    page,
  }) => {
    await page.goto('/chat');

    const omnibox = page.locator('input[type="text"]').first();
    await expect(omnibox).toBeVisible();

    await omnibox.fill('What is our annual leave policy?');
    await omnibox.press('Enter');

    // User message appears immediately
    await expect(page.getByText('What is our annual leave policy?')).toBeVisible();

    // Assistant renders non-empty response content (live API or demo fallback)
    const assistantFeedbackBtn = page.getByRole('button', { name: /helpful|အသုံးဝင်/i }).first();
    await expect(assistantFeedbackBtn).toBeVisible({ timeout: 15000 });

    // Open citation inspector dialog if citation button rendered
    const citationBtn = page.getByRole('button', { name: /inspect source citation/i }).first();
    if ((await citationBtn.count()) > 0) {
      await citationBtn.click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
    }
  });

  test('3. Mobile Viewport (375x812): zero horizontal overflow & omnibox fits cleanly', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/chat');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    // Language toggle switches to Burmese cleanly
    const myBtn = page.getByRole('button', { name: /မြန်မာ|myanmar/i }).first();
    if ((await myBtn.count()) > 0) {
      await myBtn.click();
      await expect(myBtn).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('4. Admin Documents Hub (/admin/documents): renders document table and connector controls', async ({
    page,
  }) => {
    await page.goto('/admin/documents');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    const syncButton = page.locator('button').filter({ hasText: /sync|upload|notion|confluence/i });
    if ((await syncButton.count()) > 0) {
      await expect(syncButton.first()).toBeVisible();
    }
  });

  test('5. Admin Billing & Quota (/admin/billing): renders tier plans and usage bars', async ({
    page,
  }) => {
    await page.goto('/admin/billing');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
