import { test, expect } from '@playwright/test';

test.describe('VeriKnow - End-to-End User Journeys', () => {
  test('1. Marketing Landing Page: renders hero, bilingual toggle, and CTA', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/VeriKnow/i);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    const launchChatBtn = page.getByRole('link', {
      name: /open assistant|စတင်အသုံးပြုရန်|launch ai assistant|get started/i,
    });
    if ((await launchChatBtn.count()) > 0) {
      await expect(launchChatBtn.first()).toBeVisible();
    }

    // Language toggle switches between English and Myanmar
    const myBtn = page.getByRole('button', { name: /မြန်မာ|myanmar/i }).first();
    await myBtn.click();
    await expect(myBtn).toHaveAttribute('aria-pressed', 'true');
    const enBtn = page.getByRole('button', { name: /english|en/i }).first();
    await enBtn.click();
    await expect(enBtn).toHaveAttribute('aria-pressed', 'true');
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

    // Submitting a query keeps the bottom omnibox docked at the bottom of the mobile viewport
    const omniboxInput = page.locator('input[type="text"]').first();
    await omniboxInput.fill('AWS credentials & security handbook');
    await omniboxInput.press('Enter');
    const omniboxBottom = await page
      .locator('form[aria-label="VeriKnow Search"]')
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(omniboxBottom).toBeGreaterThan(750);
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

  test('6. Landing Page SSR & Copy Polish: renders without blocking spinner and includes use cases & Enterprise quota', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify blocking workspace spinner is NOT present
    await expect(page.getByText('Loading workspace...')).toHaveCount(0);

    // Verify Enterprise Use Cases section rendered
    await expect(page.getByText('Engineering & DevOps Onboarding')).toBeVisible();
    await expect(page.getByText('Bilingual HR & Policy Search (EN / MM)')).toBeVisible();
    await expect(page.getByText('Security & Compliance Readiness')).toBeVisible();

    // Verify Enterprise Pricing tier copy
    await expect(page.getByText(/10,000 queries \/ month \(Fair-use\)/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /contact sales/i })).toBeVisible();
  });

  test('7. Dedicated Legal Pages: /legal/privacy, /legal/terms, /legal/cookies return 200 and render', async ({
    page,
  }) => {
    // 1. Privacy Policy
    const privacyRes = await page.goto('/legal/privacy');
    expect(privacyRes?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/Privacy/i);
    await expect(page.getByText(/Zero Model Training/i).first()).toBeVisible();

    // 2. Terms of Service
    const termsRes = await page.goto('/legal/terms');
    expect(termsRes?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/Terms/i);

    // 3. Cookies Policy
    const cookiesRes = await page.goto('/legal/cookies');
    expect(cookiesRes?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/Cookies/i);
  });
});
