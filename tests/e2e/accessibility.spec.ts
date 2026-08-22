import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const auditedRoutes = ['/', '/tiers/', '/compatibility/', '/docs/'] as const;

for (const route of auditedRoutes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const highImpactViolations = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );

    expect(highImpactViolations).toEqual([]);
  });
}

test('published pages expose language, titles, landmarks, headings, and a skip link', async ({
  page,
}) => {
  for (const route of auditedRoutes) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/\S+/);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
  }
});

test('compatibility filter controls are labelled and status never relies on color alone', async ({
  page,
}) => {
  await page.goto('/compatibility/');

  await expect(page.getByLabel('Platform')).toBeVisible();
  await expect(page.getByLabel('Customer tier')).toBeVisible();
  await expect(page.getByLabel('Support status')).toBeVisible();

  for (const [label, symbol] of [
    ['Supported', '✓'],
    ['Compatible', '↔'],
    ['Limited', '!'],
    ['Deprecated', '◷'],
    ['Unsupported', '×'],
  ] as const) {
    const status = page.locator('.compat-table').getByText(label, { exact: true });
    await expect(status).toBeVisible();
    await expect(status.locator('xpath=preceding-sibling::*[1]')).toHaveText(symbol);
  }
});
