import { expect, test } from '@playwright/test';

test('the real compatibility matrix preserves record parity and filters both responsive views', async ({
  page,
}) => {
  const expectedRecords = [
    ['aws-openvox-supported', 'Supported', '✓'],
    ['azure-core-compatible', 'Compatible', '↔'],
    ['docker-openvox-limited', 'Limited', '!'],
    ['google-enterprise-deprecated', 'Deprecated', '◷'],
    ['vmware-advanced-unsupported', 'Unsupported', '×'],
  ] as const;

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/compatibility/');

  const tableRows = page.locator('.compat-table tbody tr');
  await expect(tableRows).toHaveCount(5);
  for (const [index, [id, status, symbol]] of expectedRecords.entries()) {
    const row = tableRows.nth(index);
    await expect(row).toContainText(`ID / ${id}`);
    await expect(row.getByText(status, { exact: true })).toBeVisible();
    await expect(row.locator('.compat-status__symbol')).toHaveText(symbol);
  }

  await page.setViewportSize({ width: 320, height: 720 });
  const cards = page.locator('.compat-card');
  await expect(cards).toHaveCount(5);
  for (const [index, [id, status, symbol]] of expectedRecords.entries()) {
    const card = cards.nth(index);
    await expect(card).toContainText(id);
    await expect(card.getByText(status, { exact: true })).toBeVisible();
    await expect(card.locator('.compat-status__symbol')).toHaveText(symbol);
  }

  const results = page.locator('#compat-results-count');
  await expect(results).toHaveAttribute('aria-live', 'polite');
  await expect(results).toHaveAttribute('aria-atomic', 'true');
  await expect(results).toContainText('Showing 5 of 5 verified records');

  await page.getByLabel('Platform').selectOption('AWS EC2');
  await expect(results).toContainText('Showing 1 of 5 verified records');
  await expect(cards.filter({ hasText: 'aws-openvox-supported' })).toBeVisible();
  await expect(cards.filter({ hasText: 'azure-core-compatible' })).toBeHidden();
  await expect(tableRows.filter({ hasText: 'aws-openvox-supported' })).not.toHaveAttribute(
    'hidden',
  );
  await expect(tableRows.filter({ hasText: 'azure-core-compatible' })).toHaveAttribute(
    'hidden',
    '',
  );

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Customer tier').selectOption('puppet-enterprise');
  await expect(results).toContainText('Showing 1 of 5 verified records');
  await expect(cards.filter({ hasText: 'google-enterprise-deprecated' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Support status').selectOption('unsupported');
  await expect(results).toContainText('Showing 1 of 5 verified records');
  await expect(cards.filter({ hasText: 'vmware-advanced-unsupported' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(results).toContainText('Showing 5 of 5 verified records');
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) await expect(card).toBeVisible();

  const discreteControls = page.locator(
    '.compat-filters select, .compat-filters button, .compat-card__footer a',
  );
  for (const control of await discreteControls.all()) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
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

test('compatibility records remain readable when JavaScript is unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4322',
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto('/compatibility/');
  await expect(page.locator('.compat-table tbody tr')).toHaveCount(5);
  await expect(
    page.locator('.compat-table tbody tr').filter({ hasText: 'ID / aws-openvox-supported' }),
  ).toBeVisible();

  await context.close();
});
