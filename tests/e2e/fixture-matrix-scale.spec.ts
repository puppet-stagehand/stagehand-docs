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
