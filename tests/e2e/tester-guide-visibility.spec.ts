import { chromium, expect, test } from '@playwright/test';

// Proves CR-01's fix: the Tester's Guide visibility toggle must fail CLOSED. Any visitor whose
// browser never runs TesterGuideVisibility.astro's client script — JS disabled, blocked by policy
// or an extension, slow/incomplete hydration, or any other cause — must be served the honest
// "not available on this site" fallback and never the Tester's Guide body (AUTH-06, GATE-06).
//
// Runs against the `production` project's baseURL (127.0.0.1:4321, serving `dist/` via
// scripts/serve-static-build.ts with no CloudFront/KVS credential involved — per AUTH-04's
// recorded exclusion). This local server never exercises the edge gate, so no credential is
// needed to reach /docs/testers-guide/.

test.describe('no-JS / script-not-run default (fail-closed)', () => {
  test.use({ javaScriptEnabled: false });

  test('Test A: with the toggle script never executing, the fallback is visible and the guide is hidden', async ({
    page,
  }) => {
    await page.goto('/docs/testers-guide/');

    await expect(page.locator('[data-tester-guide-unavailable]')).toBeVisible();
    await expect(page.locator('[data-tester-guide]')).toBeHidden();
  });
});

// Tests B and C need window.location.hostname to genuinely resolve to a specific environment's
// hostname so resolveSiteChannel() (src/lib/site-channel.ts) makes its real allow/deny decision.
// The plan's suggested technique — overriding `window.location.hostname` (or the whole `location`
// object) via `page.addInitScript` — does not work against this Chromium build: `hostname` is an
// own, non-configurable property on the `Location` instance itself (not inherited via
// `Location.prototype`), so `Object.defineProperty` throws `Cannot redefine property` for both the
// direct-property and whole-object-replacement forms. Verified interactively before writing this
// fallback (Rule 3 — blocking issue, not a package install).
//
// Instead, each test launches its own Chromium instance with `--host-resolver-rules` mapping the
// target hostname to 127.0.0.1, then navigates to that hostname directly against the already-running
// `production` project webServer on port 4321. This produces a real, unmocked `window.location`
// with the intended hostname rather than a monkey-patched one.
async function gotoAsHostname(hostname: string) {
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${hostname} 127.0.0.1`],
  });
  const page = await browser.newPage();
  await page.goto(`http://${hostname}:4321/docs/testers-guide/`);
  return { browser, page };
}

test.describe('working-script behavior (unchanged by the fail-closed fix)', () => {
  test('Test B: a beta-hostname session with a working script shows the guide and hides the fallback', async () => {
    const { browser, page } = await gotoAsHostname('beta.puppet-stagehand.com');
    try {
      await expect(page.locator('[data-tester-guide]')).toBeVisible();
      await expect(page.locator('[data-tester-guide-unavailable]')).toBeHidden();
    } finally {
      await browser.close();
    }
  });

  test('Test C: a stable-hostname session with a working script keeps the guide hidden and the fallback visible', async () => {
    const { browser, page } = await gotoAsHostname('www.puppet-stagehand.com');
    try {
      await expect(page.locator('[data-tester-guide]')).toBeHidden();
      await expect(page.locator('[data-tester-guide-unavailable]')).toBeVisible();
    } finally {
      await browser.close();
    }
  });
});
