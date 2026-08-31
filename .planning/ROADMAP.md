# Roadmap: Puppet Stagehand documentation site

## Overview

The scaffold is the shipped baseline: every route, data loader, schema, gate, workflow, and
OpenTofu module already exists and `npm run verify` passes. Nothing has ever been applied to AWS,
no compatibility claim has ever been published, and the site has 70 lines of documentation. This
milestone closes that gap.

The journey runs credential-first, then pipeline, then content. Phase 1 writes the six
infrastructure IAM roles ADR-0003 accepted but never implemented, so the very first bootstrap apply
produces every credential GitHub Actions needs instead of leaving an administrator to hand-craft
them. Phase 2 spends those credentials: bootstrap and `testpilots` are applied for real, and the
deploy job stops reporting green while publishing nothing. Proving the delivery path early — against
the thin scaffold content, in the environment explicitly designated for integration and internal
review — means ACM validation, DNS delegation, OAC bucket policy, and the redirect function are all
exercised before anything customer-facing depends on them. Phases 3 and 4 then pour in real
substance: documentation an operator can actually follow, and compatibility records that survived
primary-evidence review. Phase 5 promotes that verified commit through beta to
`www.puppet-stagehand.com` and proves a rollback works.

Two verified facts shape the sequence. Publishing the first real compatibility record currently
**breaks the build** — four gates hard-assert an empty production register — so Phase 4 must rework
the isolation guarantee from "production is empty" to "production contains no fixture-derived
record" without weakening the evidence validation ADR-0001 protects. And the apex→`www` redirect
test exists but is wired to no runner, so the guarantee `release.md` asks a human to check by hand is
currently enforced by nothing; Phase 5 wires it in before stable carries traffic.

**The standing gate:** `npm run verify` green on `main` — lint, typecheck, unit tests, Playwright
e2e, schema validation, and the e2e build-isolation check — is a success criterion of every phase,
not the goal of one.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure Role Ownership** - Bootstrap creates and outputs the six plan and apply IAM roles, closing ADR-0003's deferral (completed 2026-08-26)
- [x] **Phase 2: First Real Publication** - Bootstrap and testpilots applied for real; the deploy pipeline stops silently skipping (completed 2026-08-26)
- [x] **Phase 3: Real Documentation Content** - An operator can learn the product, pick a tier, and run it without leaving the site (completed 2026-08-26)
- [x] **Phase 4: Evidence-Bearing Compatibility Register** - The register carries checkable claims, and the gates stop assuming it is empty (completed 2026-08-26)
- [ ] **Phase 5: Production Launch** - www.puppet-stagehand.com serves customers, with apex redirect and a proven rollback

## Phase Details

### Phase 1: Infrastructure Role Ownership

**Goal**: An administrator can apply the bootstrap root once and walk away holding every AWS credential GitHub Actions needs, with nothing left to hand-craft.
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, DRIFT-01, DRIFT-02, DRIFT-03, GATE-01
**Success Criteria** (what must be TRUE):

  1. Reading `infra/bootstrap/`, an administrator finds six named IAM roles whose trust policies each name exactly one GitHub Environment subject with no wildcard, and whose permissions match the least-privilege scoping in `docs/operations/github-environments.md` action for action.
  2. A bootstrap apply emits six role ARNs as outputs that paste directly into the six GitHub Environments, with no role reused across environments and no environment's output valid in another.
  3. An operator following `aws-bootstrap.md` and `github-environments.md` is no longer told to provision the plan and apply roles by hand, and is still told that bootstrap is human-applied under CODEOWNERS review plus a second administrator's review of the trust and permission policies.
  4. `npm run verify` is green on `main` and full OpenTofu verification passes — including new `tofu test` coverage asserting each role's trust subject and permission scope, and `./scripts/check-tofu-tags.sh` covering the bootstrap root.
  5. A reader of ADR-0002 is pointed to ADR-0003 for role ownership, and no source document still claims the site has three GitHub Environments or pins a TypeScript version the repository does not use.

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer: the three infrastructure plan roles, wired from one `for_each` local through trust policy, state-scoped permission policy, and published output

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — The three apply roles: state write, scoped S3/IAM/CloudFront/ACM/Route 53 authority, and the named unscopable CloudFront exception

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Bootstrap tags sourced from the shared local, and `check-tofu-tags.sh` extended to cover the bootstrap root
- [x] 01-04-PLAN.md — Runbooks moved onto the OpenTofu-owned role path, plus the three stale sentences closed (DRIFT-01/02/03)

### Phase 2: First Real Publication

**Goal**: The delivery pipeline actually publishes — a merge to `main` puts bytes behind a CloudFront distribution and something answers on the internet.
**Depends on**: Phase 1
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, PUB-07, GATE-02
**Success Criteria** (what must be TRUE):

  1. A visitor can load `https://testpilots.puppetstagehand.com/` over HTTPS and reach every documented route, both JSON data endpoints, and the branded 404.
  2. Merging to `main` produces a `Deploy site` run whose `Upload site` step executes, and whose post-deploy check confirms the live host serves that exact commit — a skipped or failed upload now fails the run instead of reporting green.
  3. An administrator can open all six GitHub Environments and see the specified branch rules, reviewers, and variables, with no plan Environment holding an apply or deploy role ARN and no AWS access-key secret anywhere.
  4. Opening a same-repository pull request that touches `infra/**` produces a real, value-free OpenTofu plan summary for review through a plan Environment, behind the job-level same-repository guard.
  5. The repository still contains no AWS account identifier, credential, state file, saved plan, `terraform.tfvars`, or `backend.hcl` value, and the bootstrap state sits in its approved custody location with one named owner.

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: authenticate a non-root identity, create the Route 53 hosted zone, and apply bootstrap for real, capturing every output the rest of the phase depends on

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Create and fully configure all six GitHub Environments from bootstrap's real outputs
- [x] 02-03-PLAN.md — Apply testpilots for real, validating its ACM certificate through one human-approved DNS record instead of any NS delegation change

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Harden deploy.yml's soft-skip into a hard fail, add the commit-stamp and live-verification steps (GATE-02), and land a real, verified deploy of testpilots
- [x] 02-05-PLAN.md — Prove the infrastructure plan job on a real same-repo PR, and run the phase-closing no-secrets-committed sweep

### Phase 3: Real Documentation Content

**Goal**: A first-time Stagehand operator can learn what the product does, work out which tier they need, and get it running — without leaving the site.
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, GATE-03
**Success Criteria** (what must be TRUE):

  1. A first-time operator can travel from the home page to a documented first run without hitting a placeholder, a stub, or a dead end.
  2. `/tiers/` explains in a customer's own terms what OpenVox, Puppet Core, Puppet Enterprise, and PE Advanced each entitle them to, and `/support/` says where to take a problem publicly and where to take one privately.
  3. Adding a documentation page updates navigation, the route gate, and the CloudFront invalidation list together — and CI fails when the invalidation list is missed.
  4. Axe reports zero serious or critical violations on `/`, `/tiers/`, `/compatibility/`, and `/docs/` with the new content in place, and every page is fully keyboard-operable with visible focus.
  5. No page collects credentials, asserts a customer entitlement, loads a third-party runtime script, or presents planned behaviour as behaviour that ships today.

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Tracer: the "first run" doc page wired through the content collection, the build-routes gate, the deploy invalidation list, and code-block styling
- [x] 03-02-PLAN.md — TDD: the GATE-03 invalidation-coverage checker, wired into `npm run verify`
- [x] 03-03-PLAN.md — Home, tiers, and support content: real positioning, comparative entitlement copy, and the product lifecycle section

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-04-PLAN.md — Phase-closing full `npm run verify` pass and automated CONT-06 boundary sweep

**UI hint**: yes

### Phase 4: Evidence-Bearing Compatibility Register

**Goal**: The compatibility register carries claims a reader can check for themselves — and the build stops assuming the register is empty.
**Depends on**: Phase 3
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, DRIFT-04, GATE-04
**Success Criteria** (what must be TRUE):

  1. Every record on `/compatibility/` links primary evidence a reader can open and check, and carries a `last_verified` date that is the day a maintainer actually reviewed that evidence.
  2. `npm run verify` passes with records present in `src/data/compatibility.yaml` — the isolation gate now proves no fixture-derived record reached the production build, rather than proving the register is empty, and no evidence validation was weakened to get there.
  3. The populated matrix stays readable, filterable with a visible result count, keyboard-operable, and identifiable without colour at realistic record volume, and collapses to stacked comparison cards on a narrow screen.
  4. `/data/compatibility.json` returns exactly the records the rendered page shows, with `generated_at` still `null`.
  5. When no claim qualifies, `/compatibility/` still renders the honest empty state, no fixture record has been promoted to fill it, and every sentence in the design specification about "representative content" agrees with that boundary.

**Plans**: 6/6 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Tracer: wire the third env-var-gated build target (STAGEHAND_SCALE_FIXTURES), author the 27-record scale fixture, and prove the populated matrix renders and passes axe at volume
- [x] 04-04-PLAN.md — Correct the two hard-coded "production is empty" test assumptions (json-endpoints, production-empty) so neither breaks or pressures weakened validation when a real record lands
- [x] 04-05-PLAN.md — Token gap fix for the "unsupported" status color, plus DRIFT-04's three design-spec sentence amendments

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — TDD: rework the build-isolation checker from "production is empty" to "production has no fixture-derived record", with a real negative-path leak-rejection test
- [x] 04-03-PLAN.md — Complete GATE-04's realistic-volume proof: filter correctness, 44px touch targets, keyboard tab order, long-text wrap backstops, and no-JS parity at 27 records

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-06-PLAN.md — Phase-closing full `npm run verify` pass and confirmation that the published register stayed honestly empty

### Phase 04.1: Gated Tester Access (INSERTED)

**Goal**: A tester with the shared password reaches the testing guides — including a ported Tester's Guide, visible only on testpilots/beta — and anyone without the password is refused at the edge; the password is nowhere in the public repository.
**Depends on**: Phase 4
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DOC-01, GATE-06
**Success Criteria** (what must be TRUE):

  1. A request to a gated path without credentials is refused by the CloudFront viewer-request function with `401` and a `WWW-Authenticate` challenge, before any S3 origin is reached; a request carrying the shared password is served normally.
  2. The shared password exists only in a CloudFront KeyValueStore and in the operator runbook's rotation procedure — `git grep` over the working tree and history finds no credential, no hash of one, and no placeholder that is actually live, and the repository stays public.
  3. Rotating the credential is a KeyValueStore write documented in a runbook, and does not require republishing the CloudFront function or redeploying the site.
  4. `npm run verify` is green with the gate live: `check:links` and the Playwright e2e suite either carry the credential or exclude the gated paths by an explicit, recorded rule — neither silently reports success because it stopped crawling, and neither is weakened for unrelated paths.
  5. Which paths are gated is declared in exactly one place that both the function and the verification tooling read, so an ungated testing guide is a build-visible error rather than a discovery in production.
  6. The Tester's Guide, ported from `puppet-console`'s `docs/TESTER-GUIDE.md`, sits behind the gate and renders on `testpilots`/`beta`; the identical, immutably-promoted build served on `stable` shows an honest "not available here" state instead, decided by client-side hostname detection — not a separate build.

**Canonical refs**: `puppet-console` repo at `/Users/matthew/Code/puppet-console/docs/TESTER-GUIDE.md`; PROJECT.md's immutable-promotion constraint.

**Plans**: 5/5 plans executed

Plans:

- [x] 04.1-05-PLAN.md

**Wave 1**

- [x] 04.1-01-PLAN.md — Tracer/TDD: the path-scoped KVS-backed gate as a guard clause in redirect.js, proven RED→GREEN against a real node:test suite before any AWS resource is touched

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04.1-02-PLAN.md — Apply the gate for real across testpilots/beta/stable, confirm the CloudFront Functions KVS API against a live unpublished function version, seed the shared credential, and write the rotation runbook
- [x] 04.1-03-PLAN.md — Port and curate the Tester's Guide, and wire the testpilots/beta-only client-side visibility toggle

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04.1-04-PLAN.md — Phase-closing full `npm run verify` pass and live cross-environment proof of all six success criteria plus the credential-leak sweep

### Phase 04.2: Tester Downloads (INSERTED)

**Goal**: A reader on any of the three sites can download the puppet-installer binary for the channel that site represents, sourced from a public GitHub Releases mirror, and reach ported user/installer documentation alongside it — all without needing the tester password.
**Depends on**: Phase 04.1
**Requirements**: DOWN-01, DOWN-02, DOWN-03, DOWN-04, DOC-02, DOC-03, GATE-07
**Success Criteria** (what must be TRUE):

  1. `/downloads/` presents a download link for the puppet-installer binary, resolving to the release channel matching whichever site serves the page (`test-pilots` on testpilots, `beta` on beta, `stable` on stable), determined by client-side hostname detection against the one immutably-promoted build; the version it resolves to is stated on the page, not implied.
  2. Release data and binaries come from the public `puppet-stagehand/stagehand-release` repository's GitHub Releases API — no credential for the private `puppetlabs-seteam/puppet-installer` repo is shipped to the browser or committed to this repository.
  3. The downloads page itself is reachable without the shared password; only the Tester's Guide (Phase 04.1) stays behind that gate.
  4. The page states the artifact's checksum and publication date, and a reader can verify the downloaded file against the stated checksum.
  5. When no release has been published for a channel, that channel renders an honest unavailable state naming what is missing — the page never presents a dead link or a version it cannot substantiate.
  6. The general User Guide (ported from `puppet-console`'s `docs/USER-GUIDE.md`) and reader-facing puppet-installer documentation (`registry-distribution-guide.md`, `support-guide.md`) are live in `src/content/docs/` on all three environments; maintainer-facing installer docs (`releasing.md`, `secrets.md`, `production-readiness.md`) are excluded.

**Cross-repo prerequisite**: `puppetlabs-seteam/puppet-installer` is a private/internal repo with **zero releases published anywhere**; its release workflow's public-mirror step targets a placeholder repo/secret (`souldonetworks/stagehand-release` / `STAGEHAND_RELEASE_TOKEN`) that don't exist. Before this phase can reach criteria 1, 2, 4, and 5, `puppet-stagehand/stagehand-release` must be created as a public repo, the release workflow retargeted to it (`souldonetworks` → `puppet-stagehand`), the token wired, and at least one real release cut per channel. That work is outside this repository (it touches `puppet-installer`'s workflow and GitHub org settings) and is tracked as a prerequisite, not a task of this phase. `puppet-stagehand/stagehand-release` also becomes the place testers/customers file issues about the installer or console; `stagehand-docs` keeps its own issues for docs-site problems. Criteria 3 and 6 are reachable without it.

**Canonical refs**: `puppet-console` repo at `/Users/matthew/Code/puppet-console/docs/USER-GUIDE.md`; `puppet-installer` repo docs at `/Users/matthew/Code/puppet-installer/docs/{registry-distribution-guide,support-guide}.md`; `puppet-installer/.github/workflows/release.yml` (channel-detection and mirror-step logic); PROJECT.md's immutable-promotion constraint.

**Plans**: 3/3 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 04.2-01-PLAN.md — Tracer/TDD: the build-time GitHub Releases loader, honest-unavailable-by-default downloads page, client-side channel reveal, and DOWN-03's negative gate (DOWN-01–04, GATE-07)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04.2-02-PLAN.md — Curated User Guide and reader-facing installer docs, live on all three environments (DOC-02, DOC-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04.2-03-PLAN.md — Phase-closing full `npm run verify` pass, live proof of criteria 3/6, and the WINDOWS.md deferral for criteria 1/2/4/5 pending the cross-repo prerequisite

### Phase 5: Production Launch

**Goal**: Customers read the site at `www.puppet-stagehand.com`, and a maintainer can take a bad release back.
**Depends on**: Phase 4
**Requirements**: LAUN-01, LAUN-02, LAUN-03, LAUN-04, LAUN-05, GATE-05
**Success Criteria** (what must be TRUE):

  1. A customer can load `https://www.puppet-stagehand.com/` and read the tiers, the compatibility register, and the documentation.
  2. `https://puppet-stagehand.com/` and any path beneath it redirect to the `www` host with the path and query string intact — and a test enforces that automatically, instead of a human checking it once per release.
  3. The commit verified in testpilots is the commit serving beta, and the commit verified in beta is the commit serving stable, with recorded release evidence at each step and no commit altered between environments.
  4. A maintainer can roll stable back to a known-good SHA through the protected dispatch path and see the previous pages restored, without editing a single S3 object by hand.
  5. A non-maintainer can file a private security advisory and reach a monitored address whose delivery has been tested and the test recorded.

**Plans**: 8/11 plans executed (LAUN-02 is satisfied — see 05-08's resolution note below — via
direct orchestrator action, not by incrementing this count)

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Tracer: apply `beta` for real — ACM validation without NS cutover, capture outputs
- [x] 05-04-PLAN.md — GATE-05 wiring (redirect test into verify/CI) + RELEASE-EVIDENCE.md scaffold

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Wire beta's deploy variables, dispatch testpilots's SHA, resolve the self-review approval question
- [x] 05-09-PLAN.md — Enable private vulnerability reporting; get the security@ mailbox delivery test done (LAUN-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-03-PLAN.md — Verify beta's live deployment and record the first real RELEASE-EVIDENCE.md promotion

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-05-PLAN.md — Apply `stable` for real — two-SAN ACM validation, apex-redirect function enabled

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 05-06-PLAN.md — Wire stable's deploy variables and dispatch beta's SHA

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 05-07-PLAN.md — Verify stable's live deployment (pre-cutover) and record the honest, apex-redirect-pending promotion

**Wave 7** *(blocked on Wave 6 and Wave 2's security plan completion)*

- [ ] 05-08-PLAN.md — The DNS cutover: gather NS values, the one-way registrar-flip checkpoint, verify and record the real cutover (HALTED mid-Task-2 on 2026-08-27 — `puppetstagehand.com`'s registrar, Cloudflare, does not support custom nameservers, invalidating this plan's premise; see `05-08-SUMMARY.md`)

  **Resolution note (2026-08-27):** 05-08's underlying goal — LAUN-02's real, verified DNS cutover
  with the apex redirect proven live on the public internet — was achieved, but via direct
  orchestrator action against a re-scoped domain (`puppet-stagehand.com`, registered through Route
  53 Registrar) rather than this plan's own Task 2/Task 3 resuming. Not checked off above because
  this table tracks plans completing through their own tasks, and 05-08's never did. Full record,
  including per-environment `tofu apply` resource-change counts and the `dig`/`curl` verification:
  `.planning/phases/05-production-launch/05-08-RESOLUTION.md`. Evidence entry:
  `docs/operations/RELEASE-EVIDENCE.md`. **Wave 8 is unblocked** — it depends on the domain
  genuinely being live, which it now is, not on this row's checkbox.

**Wave 8** *(blocked on Wave 7 completion — satisfied per the resolution note above, not via 05-08's own tasks)*

- [ ] 05-10-PLAN.md — Promote a newer SHA to beta, setting up a genuine rollback scenario

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 05-11-PLAN.md — Prove the rollback end to end and record it (LAUN-05)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Role Ownership | 4/4 | Complete    | 2026-08-26 |
| 2. First Real Publication | 5/5 | Complete    | 2026-08-26 |
| 3. Real Documentation Content | 4/4 | Complete    | 2026-08-26 |
| 4. Evidence-Bearing Compatibility Register | 6/6 | In Progress|  |
| 5. Production Launch | 8/11 | In Progress|  |

## Coverage

- v1 requirements: 39
- Mapped to phases: 39 ✓
- Unmapped: 0
- Duplicated across phases: 0

Per phase: Phase 1 = 10, Phase 2 = 8, Phase 3 = 8, Phase 4 = 7, Phase 5 = 6.

Full requirement text and per-requirement source traces: `.planning/REQUIREMENTS.md`.

## Sequencing Notes

**Why roles before the apply.** ADR-0003 rule 5 keeps the manual provisioning path operative until
the OpenTofu exists, so Phase 2 *could* proceed without Phase 1. It should not. Writing the six
roles first means the administrator applies bootstrap once and receives everything, instead of
applying, hand-crafting six least-privilege IAM roles from a runbook, and then re-applying later to
adopt them. Phase 1 also needs no AWS credentials, so it is pure reviewable code.

**Why testpilots publishes before the content exists.** The codebase audit calls the un-exercised
AWS path the single blocking item: the first real apply is also the first real test of ACM
validation, hosted-zone delegation, the OAC bucket policy, and the redirect function. `testpilots`
is defined as the integration and internal-review environment, so thin content there is correct.
Discovering a certificate-validation hang with an empty register costs an afternoon; discovering it
during a customer-facing launch costs the launch.

**Why the compatibility gate rework is a requirement, not an incident.** `scripts/check-e2e-build-isolation.ts`
throws unless `dist/data/compatibility.json` holds exactly zero records, and
`tests/e2e/production-empty.spec.ts`, `tests/unit/e2e-build-isolation.test.ts`, and the checked-in
`tests/fixtures/build-output/production/` fixture encode the same assumption. Whoever adds the first
reviewed claim will otherwise watch `npm run verify` fail and be tempted to weaken a check under
time pressure — exactly what ADR-0001 rule 3 forbids. Planning it as COMP-03 makes the rework
deliberate and reviewed.

**Locked decisions this roadmap does not reopen.** ADR-0001 (empty, evidence-bearing register),
ADR-0002 (six GitHub Environments over three OpenTofu environments), ADR-0003 (bootstrap owns the
plan and apply roles). See PROJECT.md → Locked Decisions.
