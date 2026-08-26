import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test("reflects the real production register's empty-or-populated state", async ({ page }) => {
  const response = await page.request.get('/data/compatibility.json');
  const body = await response.json();

  await page.goto('/compatibility/');

  if (body.records.length === 0) {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Verification queue is empty' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'No compatibility claims have completed Stagehand release verification yet.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'contact support' })).toHaveAttribute(
      'href',
      '/support/',
    );
    await expect(page.locator('[data-compatibility-matrix]')).toHaveCount(0);
  } else {
    await expect(page.locator('[data-compatibility-matrix]')).toHaveCount(1);
    // Scoped to the table only — CompatibilityMatrix.astro renders each record twice (a table
    // row and a responsive card sharing the same [data-record-id]), so an unscoped locator would
    // double-count against body.records.length.
    await expect(page.locator('.compat-table [data-record-id]')).toHaveCount(body.records.length);
  }

  expect(body).toEqual({ schema_version: 1, generated_at: null, records: body.records });
});

test('the production compatibility route has no serious or critical axe violations', async ({
  page,
}) => {
  const response = await page.request.get('/data/compatibility.json');
  const body = await response.json();

  await page.goto('/compatibility/');

  if (body.records.length === 0) {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Verification queue is empty' }),
    ).toBeVisible();
  } else {
    await expect(page.locator('[data-compatibility-matrix]')).toHaveCount(1);
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'),
  ).toEqual([]);
});
