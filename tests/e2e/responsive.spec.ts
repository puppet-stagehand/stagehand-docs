import { expect, test } from '@playwright/test';

const htmlRoutes = [
  '/',
  '/tiers/',
  '/compatibility/',
  '/docs/',
  '/docs/getting-started/',
  '/docs/security/',
  '/support/',
  '/404.html',
] as const;

for (const viewport of [
  { width: 320, height: 720 },
  { width: 640, height: 800 },
  { width: 1280, height: 800 },
]) {
  test(`published pages do not overflow at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    for (const route of htmlRoutes) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${route} overflowed horizontally`).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
    }
  });
}

test('reduced-motion users receive effectively static transitions and scrolling', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const motion = await page.evaluate(() => {
    const skipLink = document.querySelector('.skip-link');
    const heroAction = document.querySelector('.control-hero__actions .btn');
    if (!(skipLink instanceof HTMLElement) || !(heroAction instanceof HTMLElement)) {
      throw new Error('Expected visible motion-bearing controls');
    }
    return {
      heroTransition: getComputedStyle(heroAction).transitionDuration,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      skipTransition: getComputedStyle(skipLink).transitionDuration,
    };
  });

  const durationsInSeconds = (durations: string) =>
    durations.split(', ').map((duration) => {
      if (duration.endsWith('ms')) return Number.parseFloat(duration) / 1000;
      return Number.parseFloat(duration);
    });
  expect(durationsInSeconds(motion.heroTransition).every((duration) => duration <= 0.00001)).toBe(
    true,
  );
  expect(durationsInSeconds(motion.skipTransition).every((duration) => duration <= 0.00001)).toBe(
    true,
  );
  expect(motion.scrollBehavior).toBe('auto');
});

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

test('compatibility records remain readable when JavaScript is unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({
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
