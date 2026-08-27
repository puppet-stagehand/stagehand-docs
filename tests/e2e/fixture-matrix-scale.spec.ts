import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the scale-volume compatibility matrix renders every fixture record', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/compatibility/');

  await expect(page.locator('.compat-table tbody tr')).toHaveCount(27);
  await expect(page.locator('#compat-results-count')).toContainText(
    'Showing 27 of 27 verified records',
  );
});

test('the scale-volume compatibility matrix has no serious or critical axe violations', async ({
  page,
}) => {
  await page.goto('/compatibility/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const highImpactViolations = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  );

  expect(highImpactViolations).toEqual([]);
});

test('filtering at scale reflects realistic result counts across platform, tier, and status', async ({
  page,
}) => {
  await page.goto('/compatibility/');
  const results = page.locator('#compat-results-count');
  await expect(results).toContainText('Showing 27 of 27 verified records');

  await page.getByLabel('Platform').selectOption('AWS EC2');
  await expect(results).toContainText('Showing 3 of 27 verified records');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Customer tier').selectOption('pe-advanced');
  await expect(results).toContainText('Showing 6 of 27 verified records');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Support status').selectOption('unsupported');
  await expect(results).toContainText('Showing 5 of 27 verified records');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(results).toContainText('Showing 27 of 27 verified records');
});

test('every discrete control keeps its 44px minimum touch target at scale', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/compatibility/');

  const filterControls = page.locator('.compat-filters select, .compat-filters button');
  for (const control of await filterControls.all()) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  // `.compat-card__footer a` only renders as the visible control below the 48rem (768px)
  // table/card breakpoint (`.compat-cards` is `display: none` at >=48rem). Checking it at the
  // mobile viewport, where it is the actual rendered control, keeps this loop honest at 27
  // records' worth of footer links instead of asserting bounding boxes on hidden elements.
  await page.setViewportSize({ width: 320, height: 720 });
  const cardFooterLinks = page.locator('.compat-card__footer a');
  await expect(cardFooterLinks).toHaveCount(54);
  for (const link of await cardFooterLinks.all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test('the scale-volume matrix remains readable when JavaScript is unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4323',
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto('/compatibility/');
  await expect(page.locator('.compat-table tbody tr')).toHaveCount(27);
  await expect(
    page.locator('.compat-table tbody tr').filter({ hasText: 'ID / scale-00-openvox-supported' }),
  ).toBeVisible();

  await context.close();
});

test("keyboard tab order through the filters reaches the first record's links in sequence at scale", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/compatibility/');

  // CompatibilityMatrix.astro's DOM order puts the "Clear filters" reset button in
  // .compat-filters__heading, before the selects in .compat-filters__controls — so the real tab
  // sequence starts at the button, not at Platform.
  const clearFiltersButton = page.getByRole('button', { name: 'Clear filters' });
  await clearFiltersButton.focus();
  await expect(clearFiltersButton).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Platform')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Customer tier')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Support status')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Primary evidence' }).first()).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Platform guidance' }).first()).toBeFocused();
});

test('long limitation text and an unusually long platform name render without truncation at scale', async ({
  page,
}) => {
  const longLimitation =
    'This fixture record intentionally carries a limitations sentence long enough to exercise the wrap backstop check across both the table cell and the card layout at realistic content volume.';
  const longPlatformName =
    'AWS Outposts Rack (Customer-Managed On-Premises Extension of Amazon EC2)';

  // Both the table (desktop) and card (mobile) layouts render every record's full text in the
  // DOM at all times; only CSS visibility toggles which layout is on screen at a given
  // breakpoint (`.compat-table-frame` vs `.compat-cards`, see _compatibility.scss's 48rem query).
  // Scope each assertion to the layout that is actually visible at its viewport so the check
  // proves the rendered, on-screen text is untruncated rather than resolving ambiguously to
  // whichever layout happens to come first in the DOM.
  const table = page.locator('.compat-table-frame');
  const cards = page.locator('.compat-cards');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/compatibility/');
  await expect(table.getByText(longLimitation)).toBeVisible();
  await expect(table.getByText(longPlatformName).first()).toBeVisible();

  await page.setViewportSize({ width: 320, height: 720 });
  await expect(cards.getByText(longLimitation)).toBeVisible();
  await expect(cards.getByText(longPlatformName).first()).toBeVisible();
});
