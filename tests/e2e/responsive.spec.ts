import { expect, test } from '@playwright/test';

const htmlRoutes = [
  '/',
  '/features/',
  '/compatibility/',
  '/docs/',
  '/docs/getting-started/',
  '/docs/security/',
  '/docs/support/',
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
