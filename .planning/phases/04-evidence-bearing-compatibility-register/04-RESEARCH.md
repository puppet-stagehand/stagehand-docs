# Phase 4: Evidence-Bearing Compatibility Register - Research

**Researched:** 2026-08-26
**Domain:** Static-site build-pipeline isolation (Astro static output), schema-validated YAML data,
Playwright multi-project e2e testing, accessibility auditing at scale
**Confidence:** HIGH — every claim below is grounded in files read directly in this working tree
this session (Astro 7.2.4, Playwright 1.62.1, Vitest 4.1.11, ajv 8.20.0). No new external packages
are required by this phase, so there is no registry-legitimacy surface to audit.

## Summary

Phase 4 does two things that are easy to plan as separate concerns but are actually the same
mechanism seen from two ends. First, `scripts/check-e2e-build-isolation.ts` currently hard-asserts
`production.records.length === 0` — a rule that breaks the instant COMP-01/COMP-02 land the first
real, reviewed compatibility record into `src/data/compatibility.yaml`. COMP-03 must replace that
assertion with one that tolerates a non-empty, real production register while still proving that
none of its records are copies of `tests/fixtures/data/compatibility-e2e.yaml` (the ADR-0001-locked
5-record fixture). Second, GATE-04 needs the *already-built* populated-matrix UI
(`CompatibilityMatrix.astro`) exercised at realistic volume (~24-30 records) inside Playwright's
`fixture-matrix` project family — volume the ADR-0001-locked fixture is explicitly forbidden from
providing, because growing it past 5 records breaks the very isolation guarantee COMP-03 is
tightening.

The repository already contains a complete, working instance of the exact pattern both problems
need: an env-var-gated data source switch (`STAGEHAND_E2E_FIXTURES=1`) paired with an env-var-gated
Astro `outDir` switch (`./e2e-dist` vs `./dist`), consumed by two Playwright projects that point at
two different `webServer` entries serving two different static roots on two different ports. GATE-04's
open question ("how does the scale fixture get built into the pipeline") is answered by replicating
this exact pattern a third time — a third env var, a third `outDir`, a third Playwright project, a
third `webServer` entry — rather than inventing a new mechanism. COMP-03's open question ("how do we
detect a fixture-derived record without weakening evidence validation") is best answered by a
**content cross-reference**, not a schema marker field: read the known fixture source YAML files
directly in the isolation script (the same way `loadCompatibility()` already does) and assert the
production output shares no record `id` and no `platform|puppet_versions|tier|provider|transport`
identity tuple with any fixture record. This requires no schema change (the schema is
`additionalProperties: false` and is not ADR-locked to change, but changing it is unnecessary
extra surface) and catches the actual failure mode ADR-0001 rule 2 names: a fixture record copy-pasted
into the real file.

Two hard-coded "production is always empty" assertions exist **outside** the four files this phase's
`required_reading` names in COMP-03's text. `tests/unit/json-endpoints.test.ts` asserts the
`/data/compatibility.json` response body literally equals `{... records: []}`, and it will fail the
moment a real record is added — the plan must include it. `tests/fixtures/build-output/production/data/compatibility.json`
is a synthetic isolation-checker fixture (`{schema_version:1, records:[]}`) whose *content*, not just
its emptiness, needs a negative-path sibling (a record whose `id` collides with a known fixture record)
so the reworked leak-detector's rejection path is actually exercised, not merely assumed to work.

**Primary recommendation:** Extend the existing `STAGEHAND_E2E_FIXTURES` env-var/outDir/Playwright-project
pattern with a third parallel instance for the scale fixture (env var, `outDir`, project, `webServer`),
and rework `check-e2e-build-isolation.ts` to compare production's record set against the *content* of
both fixture source YAMLs rather than asserting a bare count.

## Architectural Responsibility Map

This is a fully static site (Astro `output: 'static'`) with no application server, no database, and
no client-side framework — data loading and validation happen entirely at **build time**
`[VERIFIED: astro.config.mjs:5-6]` (`output: 'static'`, `outDir` switched by
`STAGEHAND_E2E_FIXTURES`). The standard five-tier web-app model (Browser / Frontend SSR / API /
CDN / DB) does not map cleanly onto this architecture; the closest honest mapping:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Compatibility record validation (schema, HTTPS, freshness, duplicate identity) | Build tooling (closest: CDN/Static — baked at build time) | — | `loadCompatibility()` runs during `astro build`; there is no runtime validation path `[VERIFIED: src/lib/data/compatibility.ts:58-117]` |
| Populated matrix rendering + client-side filter | Browser/Client | CDN/Static | `CompatibilityMatrix.astro` ships a static table/card list plus a small inline `<script>` that toggles `hidden` attributes client-side; filtering never fetches — `tests/e2e/fixture-matrix.spec.ts:102-119` proves the table still renders correctly with `javaScriptEnabled: false` |
| `/data/compatibility.json` endpoint | CDN/Static | — | Astro static `GET` route, prerendered to a static JSON file at build time `[VERIFIED: src/pages/data/compatibility.json.ts:1-11]` |
| Build-isolation guarantee (COMP-03) | Build tooling / CI gate | — | `scripts/check-e2e-build-isolation.ts` runs post-build, pre-deploy, as a `npm run verify` step `[VERIFIED: package.json:18,28]` |
| Scale-fixture accessibility/interaction proof (GATE-04) | Build tooling / CI gate (Playwright) | Browser/Client (what's being tested) | New third Playwright project mirroring the existing `fixture-matrix` pattern `[VERIFIED: playwright.config.ts:13-30]` |
| Evidence review (COMP-01) | Human process (CODEOWNER PR review) | — | Not machine-enforceable beyond schema/freshness checks; `docs/operations/compatibility-claims.md:27-45` names it a PR checklist step, not a script |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | Every published record completed the `compatibility-claims.md` review with primary HTTPS evidence, honest `last_verified`, narrowed scope, `limitations`, CODEOWNER approval | Confirmed this is a human PR-review gate, not automatable beyond what `loadCompatibility()` already enforces (HTTPS, freshness, duplicate identity) — see Security Domain and Common Pitfalls |
| COMP-02 | `src/data/compatibility.yaml` publishes only reviewed records; empty state renders when none qualify; fixture records never promoted | `src/pages/compatibility/index.astro:38` already branches correctly on `records.length === 0` — no UI change needed; the risk is entirely in the isolation-gate rework (COMP-03) and the two additional hard-coded-empty test files found (see Common Pitfalls) |
| COMP-03 | Isolation gate reworked from "production empty" to "production has no fixture-derived record" | Full mechanism recommendation in Architecture Patterns — content cross-reference against fixture source YAMLs, not a schema marker field |
| COMP-04 | Populated matrix stays filterable/labelled/accessible/responsive at volume | UI-SPEC confirms `CompatibilityMatrix.astro` already implements this; this phase only needs to *prove* it via GATE-04's scale fixture, not build new UI |
| COMP-05 | `/data/compatibility.json` matches rendered page exactly, `generated_at` stays `null` | Already correctly implemented `[VERIFIED: src/pages/data/compatibility.json.ts:6]` — the risk is the hard-coded empty-body unit test (`json-endpoints.test.ts`), covered in Common Pitfalls |
| DRIFT-04 | Three design-spec sentences amended to match ADR-0001's delivery boundary | Exact source lines verified this session — see Code Examples |
| GATE-04 | Realistic-volume fixture exercises matrix layout/responsiveness/accessibility in `fixture-matrix` Playwright project | Full build-pipeline mechanism recommendation in Architecture Patterns |
</phase_requirements>

## Standard Stack

No new external packages are required by this phase — every mechanism below reuses libraries
already installed and already exercised by the existing test suite.

### Core (already installed, reused — not new)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | 7.2.4 | Static build, `outDir` env-var switching | Already the site's only framework `[VERIFIED: package.json:35]` |
| yaml | 2.9.0 | Parses all `.yaml` data/fixture files | Already used by `loadYaml()` `[VERIFIED: src/lib/data/load-yaml.ts:4,15]` |
| ajv + ajv-formats | 8.20.0 / 3.0.1 | Schema validation (`additionalProperties: false`, `format: uri`/`date`) | Already the site's only validation library `[VERIFIED: src/lib/data/load-yaml.ts:2-3,6-7]` |
| @playwright/test | 1.62.1 | Multi-project e2e, `webServer` orchestration | Already the site's only e2e runner `[VERIFIED: package.json:43]` |
| @axe-core/playwright | 4.13.0 | Accessibility scanning (`wcag2a/aa`, `wcag21a/aa` tags) | Already the pattern used by `accessibility.spec.ts` and `production-empty.spec.ts` `[VERIFIED: tests/e2e/accessibility.spec.ts:1,9-11; tests/e2e/production-empty.spec.ts:1,37-39]` |
| vitest | 4.1.11 | Unit tests, including the isolation-checker's own test | Already the site's only unit-test runner `[VERIFIED: package.json:56]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Content-cross-reference leak detection (recommended) | A schema `source`/`is_fixture` marker field on each record | Requires an `additionalProperties: false` schema change that then has to be re-forbidden specifically for production — more surface than needed, and it lets a leaked record "pass" if the field is stripped or the leak is a hand-edit that never carried the marker |
| Content-cross-reference leak detection (recommended) | A build-mode env-var assertion only (assert `STAGEHAND_E2E_FIXTURES` was unset during the production build) | Does not catch the realistic failure mode: a contributor hand-copying a fixture record's fields directly into `src/data/compatibility.yaml`, which involves no env var at all |
| A new Playwright project + webServer for the scale fixture (recommended) | Reusing the existing `fixture-matrix` project against a swapped-in scale dataset | Would silently break the existing 5-record parity test (`fixture-matrix.spec.ts:3-78` hard-asserts exactly 5 rows/cards and specific IDs) the moment the data source changed under it |

## Package Legitimacy Audit

Not applicable — this phase installs no new external packages. Every library referenced above is
already present in `package.json` and already exercised by the shipped test suite; none require
registry verification.

## Architecture Patterns

### System Architecture Diagram

```
                     STAGEHAND_E2E_FIXTURES=1?  STAGEHAND_SCALE_FIXTURES=1?  (neither)
                              |                          |                      |
                              v                          v                      v
                 tests/fixtures/data/       tests/fixtures/data/      src/data/
                 compatibility-e2e.yaml     compatibility-scale.yaml  compatibility.yaml
                 (ADR-0001-locked, 5)       (new, ~24-30, unlocked)   (real, COMP-01-reviewed)
                              |                          |                      |
                              +--------------------------+----------------------+
                                             loadCompatibility()
                                    [schema validate -> HTTPS check -> freshness
                                     check -> duplicate-identity check -> sort]
                                                       |
                                             astro build (outDir switch)
                                                       |
                     .e2e-dist/                 .scale-dist/                dist/
                     (5 records)                (~24-30 records)            (COMP-01 records, or [])
                              |                          |                      |
                     serve-static-build.ts      serve-static-build.ts   serve-static-build.ts
                        :4322                       :4323                    :4321
                              |                          |                      |
                    Playwright project           Playwright project      Playwright project
                    "fixture-matrix"              "fixture-matrix-scale"  "production"
                (parity/filter/keyboard,       (NEW: axe at volume,     (empty-state OR populated-
                 unchanged this phase)          keyboard at volume,      state assertions, branched
                                                 wrap backstops)          on records.length — REWORK)
                                                       |
                                        +--------------+--------------+
                                        |                             |
                              scripts/check-e2e-build-isolation.ts (REWORK, COMP-03)
                              reads dist/data/compatibility.json (production)
                              reads compatibility-e2e.yaml + compatibility-scale.yaml directly
                              asserts: no production record's id/identity-tuple
                                       appears in either fixture source
```

### Recommended Project Structure (new/changed files only)

```
tests/fixtures/data/
├── compatibility-e2e.yaml          # UNCHANGED — ADR-0001-locked, exactly 5 records
└── compatibility-scale.yaml        # NEW — ~24-30 records, NOT ADR-0001-governed

tests/fixtures/build-output/
├── production/data/compatibility.json          # REWORK — non-empty plausible-real fixture
├── production-leaked/data/compatibility.json   # NEW — negative-path fixture (id collides with e2e fixture)
└── e2e/data/compatibility.json                 # unchanged (synthetic count-only fixture)

tests/e2e/
├── production-empty.spec.ts        # REWORK — branch on empty-vs-populated production state
├── fixture-matrix.spec.ts          # UNCHANGED — 5-record parity/filter/keyboard/no-JS proof
└── fixture-matrix-scale.spec.ts    # NEW — axe scan + keyboard-at-volume + wrap backstops

tests/unit/
├── e2e-build-isolation.test.ts     # REWORK — exercise both the pass and the leak-rejection path
└── json-endpoints.test.ts          # REWORK — compatibility GET test can no longer hard-assert []

scripts/
└── check-e2e-build-isolation.ts    # REWORK — content cross-reference, not bare count

astro.config.mjs                    # add STAGEHAND_SCALE_FIXTURES -> ./.scale-dist branch
playwright.config.ts                # add fixture-matrix-scale project + third webServer entry
package.json                        # extend build:e2e / test:e2e to build+serve the third target
.gitignore                          # add .scale-dist/
src/lib/data/compatibility.ts       # add STAGEHAND_SCALE_FIXTURES path branch (mirrors e2e branch)
```

### Pattern 1: Env-var-gated data source + outDir (extend to a third instance)

**What:** A single env var simultaneously selects which YAML file `loadCompatibility()` reads and
which directory Astro writes to, so two (soon three) fully isolated static builds can exist side by
side without any runtime branching.
**When to use:** Any time a test needs a distinct, larger, or otherwise non-ADR-governed dataset
built into its own static tree, without touching the production or ADR-locked-fixture paths.
**Example (existing pattern, read directly from the tree — extend, don't replace):**
```javascript
// Source: astro.config.mjs:5-6 (existing, verified)
outDir: process.env.STAGEHAND_E2E_FIXTURES === '1' ? './.e2e-dist' : './dist',

// Recommended extension — a third, independent branch (illustrative, not yet in the tree):
outDir:
  process.env.STAGEHAND_SCALE_FIXTURES === '1'
    ? './.scale-dist'
    : process.env.STAGEHAND_E2E_FIXTURES === '1'
      ? './.e2e-dist'
      : './dist',
```
```typescript
// Source: src/lib/data/compatibility.ts:24-25,61-62 (existing pattern, verified) — extend with
// a parallel scalePath + useScaleFixtures branch, checked before useE2eFixtures so the two env
// vars stay mutually exclusive rather than silently combining.
const e2eDataPath = resolve(process.cwd(), 'tests/fixtures/data/compatibility-e2e.yaml');
const scaleDataPath = resolve(process.cwd(), 'tests/fixtures/data/compatibility-scale.yaml'); // new
```

Both `STAGEHAND_E2E_FIXTURES` and the proposed `STAGEHAND_SCALE_FIXTURES` gate `useE2eFixtures`'s
fixed validation date (`e2eValidationDate`, `2026-08-22`) — the scale fixture needs its own fixed
`today` for the same reason: it must not go stale as real calendar time passes past its
`last_verified` dates, exactly as the existing 5-record fixture is pinned `[VERIFIED: src/lib/data/compatibility.ts:26,71]`.

### Pattern 2: One Playwright project per isolated static build (extend to a third)

**What:** `testMatch`/`testIgnore` route specific spec files to a specific `baseURL`, and a matching
`webServer` entry serves the corresponding static root on its own port.
**When to use:** Whenever a distinct dataset needs its own e2e assertions without any risk of a spec
file accidentally running against the wrong build.
**Example (existing pattern — extend with a third project + webServer, illustrative):**
```typescript
// Source: playwright.config.ts:13-45 (existing, verified) — add a third project/webServer pair
// following the exact same shape as the "fixture-matrix" entry already in the file:
{
  name: 'fixture-matrix-scale',
  testMatch: 'fixture-matrix-scale.spec.ts',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4323' },
},
// ...
{
  command: 'exec env -u NO_COLOR node --import tsx scripts/serve-static-build.ts .scale-dist 4323',
  url: 'http://127.0.0.1:4323',
  reuseExistingServer: false,
  timeout: 120_000,
},
```
`scripts/serve-static-build.ts` already takes an arbitrary root and port as CLI args
`[VERIFIED: scripts/serve-static-build.ts:15-16]` — it needs no code change to serve a third target.

Also update the two existing projects' `testMatch`/`testIgnore` so the new scale spec file is
excluded from `production` (already excluded automatically, since `production`'s `testIgnore` only
names `fixture-matrix.spec.ts` — the new file needs adding there too) and from `fixture-matrix`
(needs its own `testMatch`/`testIgnore` pairing so the two "fixture-matrix*" spec files don't cross
-run against each other's `baseURL`).

### Pattern 3: Content cross-reference for fixture-derived-record detection (COMP-03 core mechanism)

**What:** Instead of a schema marker field, the isolation checker reads the known fixture source
files directly (the same files, parsed the same way `loadCompatibility()` parses them) and computes
a rejection set from their `id`s and identity tuples, then asserts the production build's records
intersect that set in exactly zero places.
**When to use:** This is the recommended mechanism for COMP-03. It requires no schema change, no new
required/optional field, and directly encodes the actual harm ADR-0001 rule 2 names — a fixture
record ending up in the published file.
**Example (illustrative rework of `scripts/check-e2e-build-isolation.ts` — not yet in the tree):**
```typescript
// Illustrative — mirrors the existing identityOf() helper already used by loadCompatibility()
// (src/lib/data/compatibility.ts:32-35) so the two identity notions never drift apart.
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';

const identityOf = (r: { platform: string; puppet_versions: string; tier: string; provider: string; transport: string }) =>
  [r.platform, r.puppet_versions, r.tier, r.provider, r.transport].join('|');

const fixtureSources = [
  'tests/fixtures/data/compatibility-e2e.yaml',       // ADR-0001-locked, 5 records
  'tests/fixtures/data/compatibility-scale.yaml',     // new, ~24-30 records
];

const forbiddenIds = new Set<string>();
const forbiddenIdentities = new Set<string>();
for (const path of fixtureSources) {
  const doc = parse(readFileSync(path, 'utf8')) as { records: Array<Record<string, unknown>> };
  for (const record of doc.records) {
    forbiddenIds.add(record.id as string);
    forbiddenIdentities.add(identityOf(record as never));
  }
}

const leaked = production.records.filter(
  (r) => forbiddenIds.has(r.id) || forbiddenIdentities.has(identityOf(r)),
);
if (leaked.length > 0) {
  throw new Error(
    `Production compatibility output contains ${leaked.length} fixture-derived record(s): ` +
      leaked.map((r) => r.id).join(', '),
  );
}
```
Keep the existing `e2e.records.length !== 5` assertion unchanged — that half of ADR-0001 rule 2 is
still locked and still worth a direct count check. Consider adding a parallel, non-ADR-governed count
sanity check for the scale build (e.g. `>= 24`) so a future accidental truncation of the scale fixture
is caught by CI rather than discovered visually.

### Anti-Patterns to Avoid
- **Growing or repurposing `compatibility-e2e.yaml`:** explicitly forbidden by ADR-0001 rule 2 (LOCKED)
  and restated in the UI-SPEC — it must stay exactly 5 records.
- **Adding a `source`/`is_fixture` marker field to the schema:** unnecessary schema surface for a
  problem the content itself already answers; also risks a leaked record "passing" if the field is
  dropped during the copy.
- **Testing only the pass-path of the reworked isolation checker:** the existing unit test
  (`tests/unit/e2e-build-isolation.test.ts`) only proves the checker accepts good input; without a
  negative-path fixture proving it *rejects* a leaked record, the rework is unverified.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Static file serving for a new dist target | A new bespoke server | `scripts/serve-static-build.ts` (already generic over root+port) | Zero code change needed — it already accepts arbitrary CLI args `[VERIFIED: scripts/serve-static-build.ts:15-16]` |
| YAML schema validation for the new scale fixture | A separate, looser validator | The existing `compatibility.schema.json` via `loadYaml()` | The scale fixture must pass the exact same schema as real records so it proves the schema copes with volume, not a relaxed shape |
| Accessibility scanning at volume | A custom DOM audit | `AxeBuilder` with the identical tag set already used site-wide | Consistency with the existing bar (`['wcag2a','wcag2aa','wcag21a','wcag21aa']`, zero serious/critical) — a different tag set would silently lower the bar for the populated state only |
| Fixture-derived-record detection | A regex/heuristic on evidence URLs (e.g. "points at this repo's issue tracker") | Direct content cross-reference against the fixture source files | One of the five locked e2e fixture records already uses a real vendor URL (`puppet.com`) as its evidence — a URL-pattern heuristic would miss it `[VERIFIED: tests/fixtures/data/compatibility-e2e.yaml:15]` |

**Key insight:** every mechanism this phase needs already exists once in the repository in a form
that generalizes cleanly to a second instance. The research risk here is not "what library solves
this" — it's "don't invent a fourth pattern when the third one is a straight copy of the second."

## Common Pitfalls

### Pitfall 1: Two hard-coded "production is empty" assertions live outside COMP-03's named files
**What goes wrong:** `tests/unit/json-endpoints.test.ts` asserts the literal response body of
`GET /data/compatibility.json` equals `{schema_version:1, generated_at:null, records:[]}`
`[VERIFIED: tests/unit/json-endpoints.test.ts:72-84]`. This test calls the real page handler against
the real `src/data/compatibility.yaml` — it is not a fixture test. It is not named in COMP-03's
`required_reading` list (`check-e2e-build-isolation.ts`, `production-empty.spec.ts`,
`e2e-build-isolation.test.ts`, `tests/fixtures/build-output/production/data/compatibility.json`) but
it encodes exactly the same stale assumption and will fail the instant COMP-01/COMP-02 add a real
record.
**Why it happens:** The assumption was correct and load-bearing when ADR-0001 was written and is
easy to miss because it lives in a generic "JSON endpoints" test file, not a compatibility-specific
one.
**How to avoid:** The plan must include `json-endpoints.test.ts` in its file list even though it
isn't in this phase's `required_reading`. Rework it to assert structural properties (status 200,
correct content-type, `generated_at: null`, `records` matches whatever `loadCompatibility()` actually
returns) rather than a hard-coded empty array — or branch the assertion like `production-empty.spec.ts`
must.
**Warning signs:** `npm run test:unit` failing immediately after the first real record is added to
`src/data/compatibility.yaml`, with a diff showing a non-empty `records` array.

### Pitfall 2: The isolation-checker unit test only proves the pass-path
**What goes wrong:** `tests/unit/e2e-build-isolation.test.ts` and
`tests/fixtures/build-output/production/data/compatibility.json` currently only exercise "checker
accepts a compliant build." Once the checker is reworked to detect fixture-derived leakage, the
existing test still only proves the *happy* path — nothing proves the rejection path actually throws
when a leaked record is present.
**Why it happens:** Rewriting a checker's logic without also rewriting its test corpus is the most
common way a security-adjacent gate ships silently broken (an `if` that never evaluates false in any
test).
**How to avoid:** Add a `tests/fixtures/build-output/production-leaked/data/compatibility.json` fixture
containing a record whose `id` (and/or identity tuple) intentionally matches a record in
`compatibility-e2e.yaml`, and a corresponding unit test asserting the checker throws with a message
naming the leaked record.
**Warning signs:** 100% line coverage on the checker script with only one test case.

### Pitfall 3: `additionalProperties: false` makes a marker-field approach a schema change, not a script change
**What goes wrong:** The compatibility schema is closed (`"additionalProperties": false`)
`[VERIFIED: src/data/schema/compatibility.schema.json:9]`. Any temptation to add a `source: fixture`
or `is_fixture: true` field to distinguish fixture records requires touching the schema every
consumer already validates against, including the production path — meaning the schema itself would
need to *forbid* that field in production specifically, which is more moving parts than the content
cross-reference in Pattern 3 above.
**Why it happens:** A marker field feels like the "obvious" fix for "is this record real."
**How to avoid:** Use the content cross-reference mechanism (Pattern 3) instead; it requires zero
schema change.
**Warning signs:** A plan task that touches `compatibility.schema.json` for COMP-03. That's a strong
signal the wrong mechanism was chosen — COMP-03 must not weaken or expand evidence validation.

### Pitfall 4: The scale fixture's `last_verified` dates will decay like any other fixture
**What goes wrong:** `loadCompatibility()` enforces a 365-day freshness window against `today`, and
the existing e2e fixture avoids decay only because `useE2eFixtures` pins `today` to a fixed
`e2eValidationDate` (`2026-08-22`) whenever `STAGEHAND_E2E_FIXTURES=1` `[VERIFIED: src/lib/data/compatibility.ts:26,71]`.
If the new `STAGEHAND_SCALE_FIXTURES` branch is added without a matching fixed-date branch, the scale
fixture will pass today and silently start failing `npm run verify` roughly a year from whenever its
`last_verified` dates were authored.
**Why it happens:** Easy to copy the `outDir`/data-path half of the pattern and miss the paired
fixed-`today` half.
**How to avoid:** Mirror `e2eValidationDate` with a `scaleValidationDate` constant, gated the same way.
**Warning signs:** A scale-fixture record with `last_verified` set to "today" at authoring time
instead of a stable date — a sign the fixed-date branch wasn't wired up and the author is dodging the
freshness check instead of pinning it.

### Pitfall 5: `fixture-matrix` and the new scale project must not cross-match spec files
**What goes wrong:** Playwright routes spec files to projects by filename pattern
(`testMatch`/`testIgnore`), not by directory `[VERIFIED: playwright.config.ts:15-16,23-24]`. Adding
`fixture-matrix-scale.spec.ts` without also excluding it from the `fixture-matrix` project (and
excluding `fixture-matrix.spec.ts` from the new project) risks both specs running against both
`baseURL`s, since the current `production` project only excludes by an exact single filename.
**Why it happens:** Filename-pattern routing is easy to get right for two projects and easy to get
subtly wrong for three, since `testIgnore`/`testMatch` need to be mutually exclusive across all three
now, not just two.
**How to avoid:** Use distinct filename prefixes (`fixture-matrix.spec.ts` vs
`fixture-matrix-scale.spec.ts`) and explicit `testIgnore` arrays (not single strings) on each project
listing every *other* project's spec file(s).

## Code Examples

### DRIFT-04 exact source locations (verified this session, quoted verbatim)
```
# Source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md:20-21 (verified via grep -n this session)
- Product tiers and compatibility claims are customer-facing and generated
  from schema-validated structured data.

# Source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md:77
The initial scaffold includes representative content for every route. Bulk

# Source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md:269
representative content and compatibility data, validation tests, GitHub Actions
```
The UI-SPEC's proposed replacement language for all three sentences is already drafted and
cross-checked against ADR-0001's own amendment wording — see `04-UI-SPEC.md`'s Copywriting Contract
table, "DRIFT-04" rows. Reuse that language rather than re-deriving it.

### The existing package.json script chain this phase must extend
```json
// Source: package.json:22-24,28 (verified)
"build:e2e": "env -u STAGEHAND_E2E_FIXTURES ASTRO_TELEMETRY_DISABLED=1 npm run build && STAGEHAND_E2E_FIXTURES=1 ASTRO_TELEMETRY_DISABLED=1 npm run build",
"test:e2e": "npm run build:e2e && env -u NO_COLOR playwright test && npm run check:e2e-isolation",
"verify": "npm run format:check && npm run lint && npm run check && npm run validate:data && npm run test:unit && npm run build && npm run check:routes && npm run check:invalidation && npm run check:links && npm run test:e2e"
```
`build:e2e` needs a third `&&`-chained build (`STAGEHAND_SCALE_FIXTURES=1 ASTRO_TELEMETRY_DISABLED=1 npm run build`)
so `.scale-dist` exists before Playwright's third `webServer` entry tries to serve it. Playwright's
`webServer` array does not build anything itself — it only runs the serve command against
already-built output, exactly as the existing two entries assume `[VERIFIED: playwright.config.ts:31-45]`.

## State of the Art

Not meaningfully applicable — this is internal build-pipeline tooling, not a public API surface with
an evolving "current best practice." The one relevant shift is architectural, not technological: the
site is moving from "the compatibility register is provably empty" to "the compatibility register is
provably free of test contamination while non-empty" — a strictly harder property to prove, which is
exactly what COMP-03 is for.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The record `id`/identity-tuple cross-reference (Pattern 3) is sufficiently strong to satisfy COMP-03's "no fixture-derived record" bar, without also requiring e.g. a full-record byte-equality check | Architecture Patterns, Pattern 3 | If a future contributor mutates one field of a copied fixture record (e.g. changes `last_verified` but keeps the same `id`/identity), the `id`-set check alone still catches it (the `id` is unchanged), but if they also change the `id` while keeping the identity tuple, only the identity check catches it — both checks are recommended together specifically to cover this, but neither is a substitute for the CODEOWNER review COMP-01 already requires |
| A2 | GATE-04's scale fixture belongs in its own Playwright project + `webServer` (a third parallel instance), rather than parameterizing the existing `fixture-matrix` project to accept a data-size argument | Architecture Patterns, Pattern 2 | This is the UI-SPEC's own framing ("new dist target, new env var, or new Playwright project") left open for research/planning to choose; the alternative (parameterizing one project) is technically possible via Playwright's `use` per-test overrides but would require restructuring `fixture-matrix.spec.ts`'s fixed 5-record assertions to be data-driven, which risks weakening the existing exact-parity test that the ADR-locked fixture depends on |
| A3 | Port 4323 is free and won't collide with any other tool in local dev or CI | Architecture Patterns, Pattern 2 | Low risk — 4321/4322 are already in use by the same file and no other config in the repo claims 4323; if it does collide, the fix is a one-line port change |

## Open Questions

1. **Will COMP-01 actually produce a real, published record within this phase, or will Phase 4 close with the register still legitimately empty?**
   - What we know: The phase goal text ("the register carries checkable claims") and Success
     Criterion 1 ("Every record on `/compatibility/` links primary evidence...") both read as
     expecting at least one real record to land. Success Criterion 5 preserves the empty-state
     rendering path as a permanently-supported *capability*, not a claim that the register stays
     empty at phase close.
   - What's unclear: Whether a real, evidence-backed claim is actually ready for CODEOWNER review
     within this phase's scope, or whether COMP-01's review process is itself scoped as a phase
     deliverable independent of whether a claim clears it in time.
   - Recommendation: The plan should not assume a specific outcome. All COMP-02/COMP-03/COMP-05
     rework must work correctly whether `src/data/compatibility.yaml` ends the phase with `records: []`
     or with real records — which is exactly what the branching recommended in Pitfall 1 and
     `production-empty.spec.ts`'s rework already provides for either way.

2. **Exact scale-fixture record count and composition** (24 minimum, ~30 target, per the UI-SPEC's
   Realistic-Volume Fixture Requirement) is a planning decision, not fully pinned by research — the
   UI-SPEC names the *minimum bar* (≥24 records, ≥10 distinct platforms, all 4 tiers × all 5 statuses
   at ≥3 each) but the exact dataset is an authoring task for the plan/executor, not a research
   finding.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (pinned `>=24 <25` via `package.json` engines and `.nvmrc: 24`) | All build/test scripts | ⚠ partial | Active shell resolves `v26.7.0` (Homebrew global), outside the pinned `>=24 <25` range `[VERIFIED: package.json:6-9; .nvmrc:1]` | Run `nvm use` (reads `.nvmrc`) before local `npm run verify`; CI is unaffected — `actions/setup-node` pins `node-version: 24` explicitly `[VERIFIED: .github/actions/setup-site/action.yml:11-14]` |
| Playwright + Chromium | `npm run test:e2e`, new `fixture-matrix-scale` project | ✓ | 1.62.1 (CLI confirmed installed) | — |
| ripgrep (`rg`) | Not used by this phase's scripts directly (only OpenTofu CI job) | n/a | n/a | n/a |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** the local Node version mismatch — use `nvm use` or run
verification through CI, which pins the correct version independently of the local shell.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (unit) + Playwright 1.62.1 (e2e), both already configured `[VERIFIED: package.json:20-24,56]` |
| Config file | `playwright.config.ts` (e2e); Vitest uses `package.json` scripts directly, no separate config file found in repo root |
| Quick run command | `npm run test:unit` (unit only, seconds) |
| Full suite command | `npm run test:e2e` (builds all Astro targets, runs all Playwright projects, then `check:e2e-isolation`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Evidence review completed before publish | manual (CODEOWNER PR review) — partially automated via `loadCompatibility()`'s HTTPS/freshness/duplicate checks | `npm run validate:data` | ✅ existing |
| COMP-02 | Register publishes only reviewed records; empty state when none qualify | e2e | `playwright test tests/e2e/production-empty.spec.ts --project=production` | ✅ exists, needs rework (Pitfall 1) |
| COMP-03 | Isolation gate detects fixture-derived leakage, not bare emptiness | unit + script | `npm run check:e2e-isolation` (+ new vitest case) | ✅ exists, needs rework + new negative-path fixture (Pitfall 2) |
| COMP-04 | Populated matrix filterable/accessible/responsive at volume | e2e | `playwright test tests/e2e/fixture-matrix-scale.spec.ts --project=fixture-matrix-scale` | ❌ Wave 0 — new file |
| COMP-05 | `/data/compatibility.json` matches rendered page, `generated_at: null` | unit + e2e | `npm run test:unit -- json-endpoints`, `playwright test production-empty.spec.ts` | ✅ exists, needs rework (Pitfall 1) |
| DRIFT-04 | Three design-spec sentences amended | manual (prose diff review) | n/a — no automated prose-drift check in this repo | n/a |
| GATE-04 | Realistic-volume fixture proven in `fixture-matrix` project family, axe-scanned | e2e | `playwright test tests/e2e/fixture-matrix-scale.spec.ts` | ❌ Wave 0 — new file |

### Sampling Rate
- **Per task commit:** `npm run test:unit` (fast feedback on schema/loader/isolation-checker logic)
- **Per wave merge:** `npm run test:e2e` (full three-way build + all Playwright projects)
- **Phase gate:** `npm run verify` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/fixtures/data/compatibility-scale.yaml` — new, ~24-30 records, not ADR-0001-governed
- [ ] `tests/fixtures/build-output/production-leaked/data/compatibility.json` — new negative-path fixture for the reworked isolation checker
- [ ] `tests/e2e/fixture-matrix-scale.spec.ts` — new axe/keyboard/wrap-backstop coverage for GATE-04
- [ ] Framework install: none — all frameworks already present

## Security Domain

`security_enforcement` is absent from `.planning/config.json`, so it is treated as enabled per
protocol. This phase's security surface is narrow — a static site with no authentication, no
session, and no runtime data path — but the evidence-integrity property ADR-0001 exists to protect is
itself a security-adjacent guarantee (a false compatibility claim is a trust/integrity failure, not
merely a content bug).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Static site, no auth surface in this phase (AUTH-01..05 belong to Phase 04.1) |
| V3 Session Management | no | No sessions anywhere in the site |
| V4 Access Control | no | No access-controlled resource in this phase |
| V5 Input Validation | yes | ajv schema validation (`additionalProperties: false`, `format: uri`/`date`) already enforced by `loadYaml()`/`loadCompatibility()` — this phase must not weaken it, only extend the isolation check around it |
| V6 Cryptography | no | No cryptographic operation in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A fixture/test record silently reaching the published register (data-integrity spoofing of the "evidence-bearing" guarantee) | Tampering / Spoofing | The COMP-03 content cross-reference (Pattern 3) — a build-time gate that cannot be bypassed by a passing schema validation alone |
| Evidence URL pointing at a non-primary source (marketing copy, forum post, this repo's own issue tracker) making it into `src/data/compatibility.yaml` | Spoofing (of claim authority) | `compatibility-claims.md`'s human PR-review checklist — not machine-enforceable beyond the HTTPS check `loadCompatibility()` already performs; CODEOWNER approval is the actual control |
| A stale (>365-day) claim silently continuing to render as current | Tampering (of freshness guarantee) | Already enforced at build time by `loadCompatibility()`'s 365-day check — unchanged by this phase, must not regress |

## Sources

### Primary (HIGH confidence — read directly this session)
- `docs/adr/0001-compatibility-scaffold.md` — locked rules governing the register, the fixture lock, the empty-state contract
- `.planning/phases/04-evidence-bearing-compatibility-register/04-UI-SPEC.md` — approved design contract, the GATE-04 open architectural question, exact copy/token requirements
- `scripts/check-e2e-build-isolation.ts`, `tests/unit/e2e-build-isolation.test.ts`, `tests/e2e/production-empty.spec.ts`, `tests/fixtures/build-output/{production,e2e}/data/compatibility.json` — current isolation-gate implementation and its test corpus
- `src/lib/data/compatibility.ts`, `src/lib/data/load-yaml.ts`, `src/data/schema/compatibility.schema.json` — validation/loading logic and the closed schema
- `astro.config.mjs`, `playwright.config.ts`, `scripts/serve-static-build.ts`, `package.json` — the existing env-var/outDir/project/webServer pattern this phase extends
- `tests/e2e/fixture-matrix.spec.ts`, `tests/e2e/accessibility.spec.ts` — existing e2e patterns for parity, filtering, keyboard, and axe assertions
- `tests/unit/data-validation.test.ts`, `tests/unit/json-endpoints.test.ts` — existing unit-test patterns and the second hard-coded-empty assertion found
- `docs/operations/compatibility-claims.md` — the human evidence-review checklist COMP-01 references
- `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` — DRIFT-04's three exact source sentences, line-verified via `grep -n`

### Secondary (MEDIUM confidence)
- none used — no web search was required; the entire mechanism generalizes from patterns already present in the working tree

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages; every library cited was read directly from `package.json` and its usage sites this session
- Architecture: HIGH - the recommended mechanism is a direct extension of a pattern already implemented twice in the tree (env var -> outDir -> Playwright project -> webServer)
- Pitfalls: HIGH - all five pitfalls are grounded in specific file/line evidence read this session, not inferred

**Research date:** 2026-08-26
**Valid until:** No external dependency; valid until the next structural change to the build/test pipeline or to ADR-0001. No 30-day expiry applies — treat as valid for the life of this phase.
