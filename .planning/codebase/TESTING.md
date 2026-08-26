# Testing Patterns

**Analysis Date:** 2026-08-26

## Test Framework

**Unit runner:**

- Vitest 4.1.11
- Config: `vitest.config.ts` — `environment: 'node'`, `include: ['tests/unit/**/*.test.ts']`
- No jsdom/browser environment; DOM behavior is verified by Playwright instead

**E2E runner:**

- Playwright 1.62.1 (`@playwright/test`) with `@axe-core/playwright` 4.13.0 for accessibility
- Config: `playwright.config.ts` — `testDir: './tests/e2e'`, `fullyParallel: false`, `reporter: 'list'`, `trace: 'retain-on-failure'`
- CI hardening: `forbidOnly` when `CI`, `retries: 2`, `workers: 1`

**Assertion library:** Vitest `expect` for unit; Playwright `expect` (auto-retrying web assertions) for E2E.

**Run Commands:**

```bash
npm run test          # Vitest watch mode
npm run test:unit     # Vitest single run
npm run build:e2e     # Build production dist/ AND fixture .e2e-dist/
npm run test:e2e      # build:e2e + playwright test + check:e2e-isolation
npm run test:a11y     # build:e2e + accessibility.spec.ts on the production project only
npm run verify        # Full gate: format, lint, check, data, unit, build, routes, links, e2e
```

## Test File Organization

**Location:** Separate `tests/` tree, never co-located with `src/`.

**Naming:**

- Unit: `tests/unit/<subject>.test.ts`
- E2E: `tests/e2e/<subject>.spec.ts`
- Fixtures: `tests/fixtures/<kind>/<case>.<ext>`

**Structure:**

```
tests/
├── unit/                       # 12 Vitest files (~69 cases)
│   ├── data-validation.test.ts       # YAML schema + business-rule guards (18 cases)
│   ├── deploy-scripts.test.ts        # shell script behavior (19 cases)
│   ├── operations-docs.test.ts       # docs/runbook content contracts (13 cases)
│   ├── built-link-policy.test.ts     # external-link policy on built output
│   ├── built-routes.test.ts          # route gate script behavior
│   ├── build-contract.test.ts
│   ├── e2e-build-isolation.test.ts
│   ├── environment-roots.test.ts     # OpenTofu environment roots
│   ├── json-endpoints.test.ts
│   ├── docs-collection.test.ts
│   ├── navigation.test.ts
│   └── status-presentation.test.ts
├── e2e/                        # 5 Playwright specs (~14 tests)
│   ├── navigation.spec.ts
│   ├── accessibility.spec.ts
│   ├── responsive.spec.ts
│   ├── fixture-matrix.spec.ts        # fixture-matrix project only
│   └── production-empty.spec.ts
└── fixtures/
    ├── data/                   # 17 YAML fixtures, one per validation failure mode
    ├── links/                  # HTML fixture dirs per link-policy case
    └── build-output/           # production/ and e2e/ compatibility.json samples
```

## Two-Build E2E Isolation Model

This is the defining testing pattern of the repository. Real product data must never leak into
fixture-driven tests, and fixtures must never leak into the shipped build.

- `npm run build:e2e` builds twice: once with `STAGEHAND_E2E_FIXTURES` unset into `dist/`, once with `STAGEHAND_E2E_FIXTURES=1` into `.e2e-dist/`
- `src/lib/data/compatibility.ts` swaps the data source only on an exact `=== '1'` match and pins validation to a fixed date (`2026-08-22`) so fixtures never age out
- Playwright serves both builds concurrently via `scripts/serve-static-build.ts`:
  - project `production` → `dist/` on `http://127.0.0.1:4321` (ignores `fixture-matrix.spec.ts`)
  - project `fixture-matrix` → `.e2e-dist/` on `http://127.0.0.1:4322` (matches only `fixture-matrix.spec.ts`)
- `scripts/check-e2e-build-isolation.ts` runs after Playwright and asserts production `data/compatibility.json` has **0** records while the E2E build has exactly **5**
- `tests/e2e/production-empty.spec.ts` asserts the production build renders the empty state

**When adding an E2E test:** put it in the `production` project unless it depends on fixture records,
in which case it belongs in `fixture-matrix.spec.ts`.

## Test Structure

**Suite Organization (unit):**

```typescript
import { describe, expect, it } from 'vitest';
import { statusPresentation } from '../../src/lib/data/status';

describe('statusPresentation', () => {
  it.each([
    ['supported', { label: 'Supported', symbol: 'check-circle' }],
    ['compatible', { label: 'Compatible', symbol: 'link' }],
  ] as const)('maps %s to a text label and non-color symbol', (status, expected) => {
    // Catches adding or changing a support state without an accessible, non-color presentation.
    expect(statusPresentation(status)).toEqual(expected);
  });
});
```

**Patterns:**

- One `describe` per subject, named after the exported symbol or the behavior gate
- Test names state the customer-visible guarantee, not the method under test — `'rejects duplicate platform-version-tier-provider-transport identities'`
- Every non-obvious test carries a `// Catches ...` comment naming the regression it prevents
- `it.each([...] as const)` for table-driven cases
- Cleanup uses `afterEach` draining a module-level array of temp dirs: `for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });` (`tests/unit/built-routes.test.ts`)

**E2E structure:**

- Top-level `test(...)` calls; no `describe` wrappers
- Route tables declared as `as const` tuples and looped — `const routes = [['/', 'Operate Puppet...'], ...] as const` in `tests/e2e/navigation.spec.ts`
- Loops may generate tests (`for (const route of auditedRoutes) test(...)`) or iterate inside one test when navigation is sequential

## Mocking

**Framework:** Vitest `vi` — used sparingly, only for time.

**Time control:**

```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date('2028-08-22T00:00:00.000Z'));
try {
  // ...
} finally {
  vi.useRealTimers();
}
```

**Environment variables** are saved, mutated, and restored in `finally`:

```typescript
const originalFlag = process.env.STAGEHAND_E2E_FIXTURES;
try {
  process.env.STAGEHAND_E2E_FIXTURES = '1';
  expect(loadCompatibility()).toHaveLength(5);
} finally {
  if (originalFlag === undefined) delete process.env.STAGEHAND_E2E_FIXTURES;
  else process.env.STAGEHAND_E2E_FIXTURES = originalFlag;
}
```

**What to Mock:**

- The clock, when validating date/freshness rules
- Process environment flags, always restored in `finally`
- Network egress is blocked, not mocked: link tests set `HTTP_PROXY`/`HTTPS_PROXY` to `http://127.0.0.1:9` with `NO_PROXY=127.0.0.1,localhost` (`tests/unit/built-link-policy.test.ts`)

**What NOT to Mock:**

- The filesystem — use real fixture files and `mkdtempSync(join(tmpdir(), 'stagehand-...'))` scratch dirs
- The module under test's dependencies — inject via the options bag (`path`, `tiersPath`, `today`) instead
- CLI scripts and shell scripts — invoke them for real with `spawnSync`
- The rendered site — Playwright drives the actual static build

## Fixtures and Factories

**Dependency injection over mocking:**

```typescript
const fixture = (name: string) => new URL(`../fixtures/data/${name}`, import.meta.url).pathname;

expect(() =>
  loadCompatibility({
    path: fixture('compatibility-duplicate.yaml'),
    today: new Date('2026-08-22Z'),
  }),
).toThrow('Duplicate compatibility record');
```

**Location and layout:**

- `tests/fixtures/data/` — one YAML file per failure mode, named for the defect: `compatibility-invalid.yaml`, `compatibility-future.yaml`, `compatibility-stale.yaml`, `compatibility-age-boundary.yaml`, `compatibility-non-https.yaml`, `compatibility-malformed-date.yaml`, `compatibility-malformed-uri.yaml`, `compatibility-unknown-field.yaml`, `compatibility-missing-field.yaml`, `compatibility-duplicate-id.yaml`, `tiers-duplicate.yaml`, `tiers-omitted.yaml`, `tiers-without-openvox.yaml`
- `compatibility-e2e.yaml` is the 5-record fixture the `.e2e-dist/` build consumes
- `tests/fixtures/links/<case>/index.html` — hand-written HTML per link-policy case (`broken-first-party`, `protocol-relative-external`, `unsupported-scheme`, `encoded-control-external`, `canonical-path-escape`, ...)
- No factory functions; explicit fixture files are preferred so the failing input is reviewable in the diff

**Adding a validation rule:** add the rule in `src/lib/data/compatibility.ts`, add a dedicated
fixture in `tests/fixtures/data/`, and add a `.toThrow('<message fragment>')` case in
`tests/unit/data-validation.test.ts`.

## Repository Check Scripts

These run inside `npm run verify` and are themselves unit-tested by spawning them.

| Script | Purpose | Covering test |
|--------|---------|---------------|
| `scripts/validate-data.ts` | Loads tiers + compatibility through the real validators | `tests/unit/data-validation.test.ts` |
| `scripts/check-built-routes.ts` | Asserts 10 required files exist in the build root | `tests/unit/built-routes.test.ts` |
| `scripts/check-built-links.ts` | Exports `validateBuiltLinks(root)` — external-link policy | `tests/unit/built-link-policy.test.ts` |
| `scripts/check-links.ts` | CLI wrapper (linkinator + built-link policy) | `tests/unit/built-link-policy.test.ts` |
| `scripts/check-e2e-build-isolation.ts` | Production build has 0 records, E2E build has 5 | `tests/unit/e2e-build-isolation.test.ts` |
| `scripts/serve-static-build.ts` | Static server used by both Playwright projects | exercised by all E2E specs |
| `scripts/deploy-site.sh` | S3/CloudFront deployment | `tests/unit/deploy-scripts.test.ts` |
| `scripts/assert-promotable-commit.sh` | Gate on promotable commits | `tests/unit/deploy-scripts.test.ts` |
| `scripts/check-tofu-tags.sh` | OpenTofu tagging policy | `.github/workflows/validate.yml` |

**Script-testing pattern:** build a temp fixture tree, `spawnSync` the script, assert on
`status` and `stderr` content.

```typescript
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', resolve('scripts/check-built-routes.ts'), join(root, 'dist')],
  { cwd: process.cwd(), encoding: 'utf8' },
);

expect(result.status).toBe(1);
expect(result.stderr).toContain('data/tiers.json');
```

Shell scripts are tested the same way, with real `git init` repositories created in temp dirs and
`PATH` stubbing for external binaries (`tests/unit/deploy-scripts.test.ts`).

## Coverage

**Requirements:** No coverage threshold is configured or enforced; `coverage/` is present in the
ESLint and Stylelint ignore lists but no reporter is wired up.

**Coverage discipline is behavioral instead:** every validation branch has a matching fixture and a
`// Catches ...` comment. Add the guard test with the guard.

## Test Types

**Unit tests (`tests/unit/`):**

- Pure logic: `navigation.test.ts`, `status-presentation.test.ts`
- Data validation against real YAML fixtures: `data-validation.test.ts`
- Script behavior via `spawnSync`: `built-routes.test.ts`, `deploy-scripts.test.ts`, `e2e-build-isolation.test.ts`
- Build/content contracts: `build-contract.test.ts`, `docs-collection.test.ts`, `json-endpoints.test.ts`
- Documentation and infrastructure contracts: `operations-docs.test.ts`, `environment-roots.test.ts`
- Some cases run a full `npm run build` (`built-link-policy.test.ts`) with a `timeout: 30_000` — these are slow by design

**E2E tests (`tests/e2e/`):**

- Run against a served static build, never `astro dev`
- `navigation.spec.ts` — every route has a unique H1 and title; primary nav reaches each destination
- `accessibility.spec.ts` — axe scan plus structural landmark/skip-link assertions
- `responsive.spec.ts` — desktop vs. narrow-viewport rendering
- `fixture-matrix.spec.ts` — full record parity and filtering across table and card views
- `production-empty.spec.ts` — production build shows the empty state

**Accessibility testing:**

```typescript
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
const highImpactViolations = results.violations.filter(
  ({ impact }) => impact === 'serious' || impact === 'critical',
);
expect(highImpactViolations).toEqual([]);
```

Assert on the empty array, not a count, so the failure output names the violating rule.

## Common Patterns

**Async testing:** plain `async`/`await`; no done callbacks. Playwright assertions are awaited and
auto-retry, so no manual `waitForTimeout`.

**Error testing:**

```typescript
expect(() =>
  loadCompatibility({ path: fixture('compatibility-future.yaml'), today: new Date('2026-08-22Z') }),
).toThrow('Compatibility evidence has a future last_verified date');
```

Assert on a distinctive message fragment — this is why error messages in `src/lib/data/` embed the
record ID and source path.

**Role-based selectors first (E2E):**

```typescript
await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: label }).click();
```

CSS selectors (`.compat-table tbody tr`, `.compat-status__symbol`) are used only when asserting on a
specific presentational structure that has no accessible role.

**Responsive assertions:** call `page.setViewportSize(...)` mid-test and re-assert against the other
layout, rather than adding a separate project — `tests/e2e/fixture-matrix.spec.ts` checks the table
at 1280×800 and the card list at 320×720.

## CI Integration

- `.github/workflows/validate.yml` runs on every pull request and push to `main`: job `site` runs `npm run verify` after `./.github/actions/setup-site`; job `infrastructure` runs `tofu fmt -check`, `scripts/check-tofu-tags.sh`, and `tofu test` for the static-site module plus each environment root
- `.github/workflows/deploy.yml` re-runs `npm run verify` on the selected commit before any promotion
- All third-party actions are pinned to full commit SHAs
- Playwright runs single-worker with 2 retries under CI; `env -u NO_COLOR` is applied around Playwright invocations in `package.json`

---

_Testing analysis: 2026-08-26_
