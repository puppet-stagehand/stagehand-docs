import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the production compatibility route shows the exact empty state and support path', async ({
  page,
}) => {
  await page.goto('/compatibility/');

  await expect(
    page.getByRole('heading', { level: 2, name: 'Verification queue is empty' }),
  ).toBeVisible();
  await expect(
    page.getByText('No compatibility claims have completed Stagehand release verification yet.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'contact support' })).toHaveAttribute(
    'href',
    '/support/',
  );
  await expect(page.locator('[data-compatibility-matrix]')).toHaveCount(0);

  const response = await page.request.get('/data/compatibility.json');
  expect(await response.json()).toEqual({
    schema_version: 1,
    generated_at: null,
    records: [],
  });
});

test('the production empty compatibility route has no serious or critical axe violations', async ({
  page,
}) => {
  await page.goto('/compatibility/');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Verification queue is empty' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'),
  ).toEqual([]);
});
