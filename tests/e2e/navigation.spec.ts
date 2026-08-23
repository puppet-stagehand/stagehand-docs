import { expect, test } from '@playwright/test';

const routes = [
  ['/', 'Operate Puppet with less ceremony.'],
  ['/tiers/', 'Stagehand tiers'],
  ['/compatibility/', 'Compatibility register'],
  ['/docs/', 'Documentation'],
  ['/docs/getting-started/', 'Getting started'],
  ['/docs/security/', 'Security and trust boundaries'],
  ['/support/', 'Stagehand support'],
] as const;

test('every published HTML route has its unique page heading and document title', async ({
  page,
}) => {
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page).toHaveTitle(/Puppet Stagehand/);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  }
});

test('primary navigation reaches each top-level destination', async ({ page }) => {
  const destinations = [
    ['Tiers', '/tiers/'],
    ['Compatibility', '/compatibility/'],
    ['Docs', '/docs/'],
    ['Support', '/support/'],
  ] as const;

  for (const [label, path] of destinations) {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', {
        name: label,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
  }
});

test('the native mobile menu opens with Enter and Space', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');

  const menu = page.getByText('Menu', { exact: true });
  const mobileNavigation = page.getByRole('navigation', { name: 'Primary mobile navigation' });
  await expect(mobileNavigation).toBeHidden();
  expect((await menu.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(mobileNavigation).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(mobileNavigation).toBeHidden();

  await page.keyboard.press('Space');
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.getByRole('link', { name: 'Compatibility' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Compatibility register' }),
  ).toBeVisible();
});

test('keyboard focus starts at the skip link and moves to main content', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveCSS('outline-style', 'solid');

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('an unknown route renders the useful static 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse documentation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Find support' })).toBeVisible();
});
