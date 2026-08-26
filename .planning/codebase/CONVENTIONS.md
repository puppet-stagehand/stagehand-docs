# Coding Conventions

**Analysis Date:** 2026-08-26

## Naming Patterns

**Files:**

- TypeScript library/script modules: `kebab-case.ts` — `src/lib/data/load-yaml.ts`, `scripts/check-built-routes.ts`, `scripts/check-e2e-build-isolation.ts`
- Astro components and layouts: `PascalCase.astro` — `src/components/CompatibilityMatrix.astro`, `src/layouts/BaseLayout.astro`
- SCSS partials: leading underscore, kebab-case — `src/styles/_tokens.scss`, `src/styles/components/_status-mark.scss`
- Unit tests: `tests/unit/<subject>.test.ts` — `tests/unit/data-validation.test.ts`
- E2E tests: `tests/e2e/<subject>.spec.ts` — `tests/e2e/fixture-matrix.spec.ts`
- Data and fixtures: kebab-case YAML — `src/data/compatibility.yaml`, `tests/fixtures/data/compatibility-duplicate-id.yaml`
- Shell scripts: kebab-case `.sh` — `scripts/deploy-site.sh`, `scripts/assert-promotable-commit.sh`

**Functions:**

- `camelCase`, declared as `const` arrow functions with explicit return types on exported members — `export const loadYaml = <T>(path: string, schema: AnySchema, label: string): T =>` in `src/lib/data/load-yaml.ts`
- Verb-first for actions (`loadCompatibility`, `validateBuiltLinks`, `readCompatibilityOutput`), noun-first for pure mappers (`statusPresentation` in `src/lib/data/status.ts`)
- Small module-private helpers are also arrow consts near the top of the file — `identityOf`, `utcDate`, `utcToday` in `src/lib/data/compatibility.ts`

**Variables:**

- `camelCase` for locals and module constants; no `SCREAMING_SNAKE_CASE` — `dataPath`, `e2eValidationDate`, `requiredOutputs`
- Fixed lookup tables use `as const` or `Record<...>` — `const requiredOutputs = [...] as const` in `scripts/check-built-routes.ts`
- Numeric separators for large literals — `86_400_000`, `120_000`, `15_000`
- SCSS variables use `$kebab-case` with a `$stagehand-` brand prefix, then map onto Bootstrap variables — `src/styles/_tokens.scss`

**Types:**

- `PascalCase` interfaces and type aliases — `NavigationItem` (`src/lib/navigation.ts`), `CompatibilityRecord` (`src/lib/data/types.ts`), `StatusPresentation` (`src/lib/data/status.ts`)
- Astro component props are always a local `interface Props { ... }` in the frontmatter — `src/components/StatusMark.astro`, `src/layouts/BaseLayout.astro`
- Options bags are named `<Verb><Noun>Options` — `LoadCompatibilityOptions` in `src/lib/data/compatibility.ts`
- Data field names inside YAML/JSON payloads stay `snake_case` (`puppet_versions`, `last_verified`, `schema_version`); do not camelCase persisted data keys

## Code Style

**Formatting:**

- Prettier 3.9 configured inline in `package.json`: `singleQuote: true`, `printWidth: 100`, plugin `prettier-plugin-astro`
- `.editorconfig`: UTF-8, LF endings, 2-space indent, final newline required
- `.prettierignore` excludes build and vendor output (`dist/`, `.e2e-dist/`, `.astro/`, `playwright-report/`, `test-results/`, `.tofu/`, `*.tfstate*`)
- Enforced in CI via `npm run format:check`; fix with `npm run format`

**Linting:**

- ESLint 10 flat config in `eslint.config.js`: `typescript-eslint` recommended + `eslint-plugin-astro` recommended, with `.astro` files parsed by `tseslint.parser`
- Stylelint 17 in `stylelint.config.mjs` extending `stylelint-config-standard-scss`, run against `src/**/*.scss`
- Disabled Stylelint rules that conflict with the Bootstrap/token approach: `color-function-notation`, `color-hex-length`, `selector-class-pattern`, `alpha-value-notation`, `value-keyword-case`, `media-feature-range-notation`, and two `scss/*` layout rules
- Both share the same ignore list as ESLint (`dist`, `.astro`, `.e2e-dist`, `coverage`, `node_modules`, `playwright-report`, `test-results`)
- Run both with `npm run lint`

**TypeScript:**

- `tsconfig.json` extends `astro/tsconfigs/strict` — strict null checks and no implicit `any` apply everywhere
- ESM only (`"type": "module"`); scripts run through `tsx` (`node --import tsx scripts/...`)
- Top-level `await` is used freely in scripts (`scripts/check-built-routes.ts`, `scripts/check-e2e-build-isolation.ts`)

## Import Organization

**Order (observed consistently):**

1. Node builtins with the `node:` prefix — `import { readFileSync } from 'node:fs';`
2. External packages — `ajv/dist/2020.js`, `yaml`, `vitest`, `@playwright/test`
3. Relative project modules — `./types`, `../../src/lib/data/compatibility`

**Rules:**

- Always use the `node:` protocol for builtins; never bare `fs`/`path`
- Type-only imports use `import type` — `import type { CompatibilityRecord } from './types';`
- No path aliases are configured; relative paths are used throughout, including from tests into `src/`
- Astro components import styles and fonts at the top of frontmatter before component imports — `src/layouts/BaseLayout.astro`

## Error Handling

**Patterns:**

- Fail fast by throwing `Error` with a message that names both the offending record and the source file — `` throw new Error(`Duplicate compatibility record ID ${record.id}; record IDs must be unique in ${source}`) `` in `src/lib/data/compatibility.ts`
- Wrap low-level I/O failures with context, preserving the original message — `` throw new Error(`Could not read ${label} data from ${path}: ${(error as Error).message}`) `` in `src/lib/data/load-yaml.ts`
- Aggregate validation errors before throwing rather than reporting only the first — `describeErrors` joins all Ajv errors (`allErrors: true`)
- Astro components validate their required environment and throw during build — `if (!Astro.site) throw new Error('Astro.site must be configured to create canonical URLs.');` in `src/layouts/BaseLayout.astro`
- CLI scripts either throw (non-zero exit through the runtime) or write to `stderr` and `exit 1`; shell scripts use `set -euo pipefail`
- Never swallow errors silently; the only bare `catch {}` blocks convert a missing file into an explicit "missing" entry — `scripts/check-built-routes.ts`

## Logging

**Framework:** `console` only; no logging library.

**Patterns:**

- Scripts print exactly one success summary line with counts so CI logs are auditable — `` console.log(`Verified ${requiredOutputs.length} required built routes`) ``, `` console.log(`Validated ${tiers.length} tiers and ${compatibility.length} compatibility records`) ``
- Failures go to `stderr` (or a thrown `Error`), never `console.log`
- No logging inside `src/lib/**` — library code throws and lets the caller report

## Comments

**When to Comment:**

- Production code is comment-light and relies on descriptive naming
- Tests carry a one-line `// Catches ...` comment above non-obvious assertions describing the regression the test prevents — `// Catches a production change that returns raw YAML documents rather than validated records.` in `tests/unit/data-validation.test.ts`
- Comment the *why* (invariant being protected), not the *what*

**JSDoc/TSDoc:** Not used. Exported symbols rely on explicit TypeScript signatures instead.

## Function Design

**Size:** Small and single-purpose. Helpers are extracted as soon as a validation step needs more than a few lines (`utcDate`, `identityOf`, `describeErrors`).

**Parameters:**

- Zero-to-three positional parameters; anything optional goes in a single options object with a default — `loadCompatibility(options: LoadCompatibilityOptions = {})`
- Options objects exist specifically to make code testable: `path`, `tiersPath`, and `today` allow fixture injection without mocking the filesystem or clock

**Return Values:**

- Return validated, normalized values — `loadCompatibility` returns a sorted copy (`[...document.records].sort(...)`), never the raw parsed document
- Sorting uses locale-explicit comparisons with tie-breaker chains — `left.platform.localeCompare(right.platform, 'en') || ...`
- Generics carry the caller's expected shape (`loadYaml<T>`); the single `as T` cast happens only after schema validation

## Module Design

**Exports:**

- Named exports only; no default exports in `src/lib/**` or `scripts/**`
- Config files (`eslint.config.js`, `stylelint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `src/content.config.ts`) use the default/named export their tooling requires
- Scripts that are also unit-tested export their core function and keep the CLI wrapper thin — `validateBuiltLinks` from `scripts/check-built-links.ts` is imported directly by `tests/unit/built-link-policy.test.ts`

**Barrel Files:** Not used. Import the specific module (`src/lib/data/compatibility`), never an `index` re-export.

**Data layer:**

- All external data passes through `src/lib/data/load-yaml.ts`, which validates against a JSON Schema in `src/data/schema/` with Ajv 2020 in `strict: true` mode before any code sees it
- Content collections are schema-validated with Zod in `src/content.config.ts`
- Environment-driven behavior is gated on an exact string match, never truthiness — `process.env.STAGEHAND_E2E_FIXTURES === '1'` in `src/lib/data/compatibility.ts`

## Astro Component Conventions

- Frontmatter order: imports, `interface Props`, `Astro.props` destructuring with defaults, derived constants, guards
- Destructure props with inline defaults — `const { label, tone = 'cyan' } = Astro.props;` in `src/components/StatusMark.astro`
- Use `class:list` for conditional/variant classes rather than template string concatenation
- BEM-flavored class names scoped by component — `status-mark`, `status-mark__indicator`, `status-mark--cyan`, `compat-card__mono`
- Accessibility is part of the component contract: `aria-hidden` on decorative marks, skip link plus `id="main-content"` and `tabindex="-1"` on `<main>` in `src/layouts/BaseLayout.astro`, `aria-live="polite"` on result counts
- Status is never conveyed by color alone — `src/lib/data/status.ts` pairs every state with a text label and a distinct symbol

## Verification Gate

`npm run verify` is the single authoritative gate and runs, in order:
`format:check` → `lint` → `astro check` → `validate:data` → `test:unit` → `build` → `check:routes` → `check:links` → `test:e2e`.

Per `CONTRIBUTING.md`, run it *after* the final edit, not only before it.

---

_Convention analysis: 2026-08-26_
