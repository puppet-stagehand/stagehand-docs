# Graph Report - stagehand-docs  (2026-08-26)

## Corpus Check
- 216 files · ~405,428 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1537 nodes · 1491 edges · 152 communities (122 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ec0ca151`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compatibility.ts
- README.md
- devDependencies
- Constraints
- properties
- ../../layouts/BaseLayout.astro
- Pattern Assignments
- Architecture
- scripts
- check-built-links.ts
- Puppet Stagehand website and documentation design
- Phase 01 Plan 01: Infrastructure Plan Roles Summary
- Phase 01 Plan 02: Infrastructure Apply Roles Summary
- Phase 1: Infrastructure Role Ownership - Research
- v1 Requirements
- Phase Details
- Global Constraints
- Testing Patterns
- Puppet Stagehand documentation site
- Coding Conventions
- Project State
- Codebase Concerns
- Synthesis Summary
- Phase 1 — Validation Strategy
- deploy-scripts.test.ts
- External Integrations
- Common Pitfalls
- Continue — Stagehand docs AWS publication
- ADR-0001: Ship an empty, evidence-bearing compatibility registry
- ADR-0002: Six GitHub Environments, three OpenTofu environments
- ADR-0003: The bootstrap root owns the infrastructure plan and apply roles
- Technology Stack
- Codebase Structure
- Context
- Architecture Patterns
- compatibility.schema.json
- type
- properties
- User Constraints
- serve-static-build.ts
- environment-roots.test.ts
- Code Examples
- security.md
- redirect.test.mjs
- Conflict Detection Report
- Decisions
- Validation Architecture
- getting-started.md
- items
- redirect.js
- Standard Stack
- Sources
- check-built-routes.ts
- navigation.ts
- docs-collection.test.ts
- operations-docs.test.ts
- Third-party notices
- 01-01-PLAN.md
- 01-02-PLAN.md
- 01-03-PLAN.md
- 01-04-PLAN.md
- Security Domain
- check-e2e-build-isolation.ts
- content.config.ts
- compatibility.ts
- Phase 01 Plan 04: Runbook and ADR Drift Reconciliation Summary
- properties
- WINDOWS.md
- items
- Goal Achievement
- Phase 2: First Real Publication - Research
- docs_path
- built-routes.test.ts
- requirements.md
- assert-promotable-commit.sh
- check-tofu-tags.sh
- deploy-site.sh
- accessibility.spec.ts
- navigation.spec.ts
- responsive.spec.ts
- tsconfig.json
- e2e-build-isolation.test.ts
- evidence_url
- id
- last_verified
- platform
- provider
- puppet_versions
- transport
- Phase 2: First Real Publication - Context
- dependencies
- package.json
- prettier
- 02-03-PLAN.md
- 02-04-PLAN.md
- 02-05-PLAN.md
- Phase 02 Plan 01: First Real AWS Publication Bootstrap Summary
- Phase 02 Plan 02: GitHub Environments Summary
- dependencies
- Phase 02 Plan 04: Deploy Pipeline Hardening + Live Verification Summary
- check-live-deployment.ts
- Phase 02 Plan 05: Infrastructure Plan-Job PUB-06 Proof Summary
- ADR-0004: Self-review permitted on plan Environments for a solo maintainer
- Goal Achievement
- Phase 3 — UI Design Contract
- Phase 03 Plan 02: GATE-03 Invalidation Coverage Checker Summary
- check-invalidation-coverage.ts
- invalidation-coverage.test.ts
- 03-01-PLAN.md
- 03-02-PLAN.md
- 03-03-PLAN.md
- 03-04-PLAN.md
- Phase 3 Plan 1: Real Documentation Content — First-Run Tracer Summary
- first-run.md
- Phase 3 Plan 3: Real Documentation Content — Home, Tiers, Support Summary
- compatibility.ts
- Goal Achievement
- Phase 4: Evidence-Bearing Compatibility Register - Research
- Phase 4 — Validation Strategy
- 04-01-PLAN.md
- 04-02-PLAN.md
- 04-03-PLAN.md
- 04-04-PLAN.md
- platform
- 04-05-PLAN.md
- 04-06-PLAN.md
- Phase 4 Plan 05: Untokenized Color and DRIFT-04 Spec Amendments Summary
- ../../components/CompatibilityMatrix.astro
- index.astro
- index.astro
- loadYaml
- stagehand_versions
- dependencies
- package.json
- prettier
- loadYaml
- Phase 4 Plan 3: GATE-04 Realistic-Volume Assertions Summary
- deferred-items.md
- Goal Achievement
- stagehand_versions
- Phase 5: Production Launch - Context
- Phase 5: Production Launch - Discussion Log
- stagehand_versions

## God Nodes (most connected - your core abstractions)
1. `Communities (149 total, 30 thin omitted)` - 111 edges
2. `Constraints` - 37 edges
3. `Phase 1: Infrastructure Role Ownership - Research` - 22 edges
4. `Phase 5: Production Launch - Research` - 20 edges
5. `scripts` - 19 edges
6. `Phase 2: First Real Publication - Research` - 19 edges
7. `Phase 4: Evidence-Bearing Compatibility Register - Research` - 18 edges
8. `Puppet Stagehand website and documentation design` - 14 edges
9. `../../layouts/BaseLayout.astro` - 13 edges
10. `loadCompatibility()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `validateBuiltLinks()` --calls--> `loadCompatibility()`  [EXTRACTED]
  scripts/check-built-links.ts → src/lib/data/compatibility.ts
- `LeakCheckRecord` --references--> `CompatibilityRecord`  [EXTRACTED]
  scripts/check-e2e-build-isolation.ts → src/lib/data/types.ts
- `loadForbiddenSets()` --calls--> `identityOf()`  [EXTRACTED]
  scripts/check-e2e-build-isolation.ts → src/lib/data/compatibility.ts
- `CompatibilityDocument` --references--> `CompatibilityRecord`  [EXTRACTED]
  src/lib/data/compatibility.ts → src/lib/data/types.ts
- `loadCompatibility()` --calls--> `loadYaml()`  [EXTRACTED]
  src/lib/data/compatibility.ts → src/lib/data/load-yaml.ts

## Import Cycles
- None detected.

## Communities (152 total, 30 thin omitted)

### Community 0 - "compatibility.ts"
Cohesion: 0.14
Nodes (13): compatibility, tiers, ajv, describeErrors(), loadYaml(), assertExactTierSet(), dataPath, loadTiers() (+5 more)

### Community 1 - "README.md"
Cohesion: 0.05
Nodes (39): Contributing to Stagehand documentation, Keep changes reviewable, Prepare the checkout, Report security problems privately, 1. Create the shared bootstrap resources, 2. Configure one environment backend, 3. Plan, review tags, and apply, 4. Audit applied tags (+31 more)

### Community 2 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, @astrojs/check, @axe-core/playwright, eslint, eslint-plugin-astro, linkinator, parse5, @playwright/test (+9 more)

### Community 3 - "Constraints"
Cohesion: 0.05
Nodes (37): Accessibility target, AWS static-site module composition, Cache-control policy, Chosen technology stack, Compatibility claim evidence requirement, Compatibility freshness rule, Compatibility pull-request checklist, Compatibility record content model (+29 more)

### Community 4 - "properties"
Cohesion: 0.06
Nodes (32): additionalProperties, minLength, type, enum, items, type, enum, additionalProperties (+24 more)

### Community 5 - "../../layouts/BaseLayout.astro"
Cohesion: 0.10
Nodes (16): @fontsource/ibm-plex-sans/latin-400.css, @fontsource/ibm-plex-sans/latin-600.css, ../components/DocsNavigation.astro, orderedEntries, ../components/SiteFooter.astro, ../components/SiteHeader.astro, ../components/StatusMark.astro, ../../layouts/BaseLayout.astro (+8 more)

### Community 6 - "Pattern Assignments"
Cohesion: 0.09
Nodes (22): CI wiring, `docs/adr/0002-github-environment-model.md` (modified — DRIFT-01, References only), `docs/operations/aws-bootstrap.md` (modified — INFRA-05), `docs/operations/github-environments.md` (modified — INFRA-05), File Classification, Formatting, `infra/bootstrap/iam-github-actions.tf` (NEW — IaC, IAM role + inline policy), `infra/bootstrap/locals.tf` (NEW — config) (+14 more)

### Community 7 - "Architecture"
Cohesion: 0.10
Nodes (19): Anti-Patterns, Architectural Constraints, Architecture, Bespoke CSS outside the token system, Compatibility data path, Component Responsibilities, Cross-Cutting Concerns, Data Flow (+11 more)

### Community 8 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, build:e2e, check, check:e2e-isolation, check:invalidation, check:links, check:routes (+11 more)

### Community 9 - "check-built-links.ts"
Cohesion: 0.17
Nodes (12): allowedNonClaimLinks, canonicalBase, canonicalDocumentUrl(), canonicalOutput(), htmlFiles(), linkAttributes(), nonNetworkSchemes, recordSource() (+4 more)

### Community 10 - "Puppet Stagehand website and documentation design"
Cohesion: 0.12
Nodes (15): AWS infrastructure, Chosen approach, Content model, Delivery boundary, Failure behavior and recovery, GitHub and deployment flow, Non-goals for the scaffold, Puppet Stagehand website and documentation design (+7 more)

### Community 11 - "Phase 01 Plan 01: Infrastructure Plan Roles Summary"
Cohesion: 0.12
Nodes (15): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+7 more)

### Community 12 - "Phase 01 Plan 02: Infrastructure Apply Roles Summary"
Cohesion: 0.12
Nodes (15): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+7 more)

### Community 13 - "Phase 1: Infrastructure Role Ownership - Research"
Cohesion: 0.13
Nodes (14): Architectural Responsibility Map, Assumptions Log, Documentation Edit Map (INFRA-05, DRIFT-01/02/03), Don't Hand-Roll, Environment Availability, Metadata, Open Questions (RESOLVED), Package Legitimacy Audit (+6 more)

### Community 14 - "v1 Requirements"
Cohesion: 0.12
Nodes (16): Compatibility register (COMP), Derivation note, Documentation drift (DRIFT), Infrastructure role ownership (INFRA), Launch (LAUN), Operational hardening (OPS), Out of Scope, Publication pipeline (PUB) (+8 more)

### Community 15 - "Phase Details"
Cohesion: 0.13
Nodes (14): Coverage, Overview, Phase 04.1: Gated Tester Access (INSERTED), Phase 04.2: Tester Downloads (INSERTED), Phase 1: Infrastructure Role Ownership, Phase 2: First Real Publication, Phase 3: Real Documentation Content, Phase 4: Evidence-Bearing Compatibility Register (+6 more)

### Community 16 - "Global Constraints"
Cohesion: 0.14
Nodes (13): Global Constraints, Puppet Stagehand Website and Documentation Implementation Plan, Task 10: Document operations, cost boundaries, and release setup, Task 11: Perform final release-candidate verification, Task 1: Bootstrap a typed static Astro route, Task 2: Build the Stagehand visual shell and navigation, Task 3: Define and enforce tier and compatibility data contracts, Task 4: Render tiers, compatibility, and downloadable JSON (+5 more)

### Community 17 - "Testing Patterns"
Cohesion: 0.15
Nodes (12): CI Integration, Common Patterns, Coverage, Fixtures and Factories, Mocking, Repository Check Scripts, Test File Organization, Test Framework (+4 more)

### Community 18 - "Puppet Stagehand documentation site"
Cohesion: 0.15
Nodes (12): Active, Business Context, Constraints, Context, Core Value, Key Decisions, Locked Decisions, Out of Scope (+4 more)

### Community 19 - "Coding Conventions"
Cohesion: 0.17
Nodes (11): Astro Component Conventions, Code Style, Coding Conventions, Comments, Error Handling, Function Design, Import Organization, Logging (+3 more)

### Community 20 - "Project State"
Cohesion: 0.17
Nodes (11): Accumulated Context, Blockers/Concerns, Current Position, Decisions, Deferred Items, Pending Todos, Performance Metrics, Project Reference (+3 more)

### Community 21 - "Codebase Concerns"
Cohesion: 0.18
Nodes (10): Codebase Concerns, Dependencies at Risk, Fragile Areas, Known Bugs, Missing Critical Features, Performance Bottlenecks, Scaling Limits, Security Considerations (+2 more)

### Community 22 - "Synthesis Summary"
Cohesion: 0.18
Nodes (10): Conflicts, Constraints (36), Context topics (6), Cycle detection, Decisions locked (3), Doc counts by type, Intel files, Requirements extracted (0) (+2 more)

### Community 23 - "Phase 1 — Validation Strategy"
Cohesion: 0.20
Nodes (9): audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117), Manual-Only Verifications, Per-Task Verification Map, Phase 1 — Validation Strategy, Sampling Rate, status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6), Test Infrastructure, Validation Sign-Off (+1 more)

### Community 24 - "deploy-scripts.test.ts"
Cohesion: 0.24
Nodes (9): deployScript, initializeRepository(), promotionScript, repositoryRoot, run(), temporaryDirectories, temporaryDirectory(), WorkflowJob (+1 more)

### Community 25 - "External Integrations"
Cohesion: 0.22
Nodes (8): APIs & External Services, Authentication & Identity, CI/CD & Deployment, Data Storage, Environment Configuration, External Integrations, Monitoring & Observability, Webhooks & Callbacks

### Community 26 - "Common Pitfalls"
Cohesion: 0.22
Nodes (9): Common Pitfalls, Pitfall 1: Writing the apply policy around `aws:ResourceTag`, Pitfall 2: A tag condition on a create action that the provider does not send tags with, Pitfall 3: `ForAllValues` in an Allow statement without a `Null` guard, Pitfall 4: The `stable` apex does not match `*.puppetstagehand.com`, Pitfall 5: Collapsing bootstrap's two different tag shapes into one `required_tags`, Pitfall 6: Breaking `scripts/check-tofu-tags.sh` while extending it, Pitfall 7: The apply policy overflowing the inline-policy budget (+1 more)

### Community 27 - "Continue — Stagehand docs AWS publication"
Cohesion: 0.25
Nodes (7): Continue — Stagehand docs AWS publication, Do not, Last action, Next action, Open threads, References, Why

### Community 28 - "ADR-0001: Ship an empty, evidence-bearing compatibility registry"
Cohesion: 0.25
Nodes (7): ADR-0001: Ship an empty, evidence-bearing compatibility registry, Alternatives rejected, Consequences, Context, Decision, References, Status

### Community 29 - "ADR-0002: Six GitHub Environments, three OpenTofu environments"
Cohesion: 0.25
Nodes (7): ADR-0002: Six GitHub Environments, three OpenTofu environments, Alternatives rejected, Consequences, Context, Decision, References, Status

### Community 30 - "ADR-0003: The bootstrap root owns the infrastructure plan and apply roles"
Cohesion: 0.25
Nodes (7): ADR-0003: The bootstrap root owns the infrastructure plan and apply roles, Alternatives rejected, Consequences, Context, Decision, References, Status

### Community 31 - "Technology Stack"
Cohesion: 0.25
Nodes (7): Configuration, Frameworks, Key Dependencies, Languages, Platform Requirements, Runtime, Technology Stack

### Community 32 - "Codebase Structure"
Cohesion: 0.25
Nodes (7): Codebase Structure, Directory Layout, Directory Purposes, Key File Locations, Naming Conventions, Special Directories, Where to Add New Code

### Community 33 - "Context"
Cohesion: 0.25
Nodes (7): AWS bootstrap and per-environment apply, AWS cost estimation, Context, GitHub Environment configuration, Published page: Getting started, Published page: Security and trust boundaries, Release promotion and rollback

### Community 34 - "Architecture Patterns"
Cohesion: 0.25
Nodes (8): Anti-Patterns to Avoid, Architecture Patterns, Pattern 1: One `for_each` map is the single source of the six roles, Pattern 2: Trust policy shape is already settled — copy it, Pattern 3: Assert policies by exact JSON equality, never by substring, Pattern 4: Mock the data sources, not the buckets, System Architecture Diagram, Where the new files go

### Community 35 - "compatibility.schema.json"
Cohesion: 0.25
Nodes (7): additionalProperties, properties, schema_version, required, $schema, const, type

### Community 36 - "type"
Cohesion: 0.29
Nodes (8): minLength, type, items, type, items, type, limitations, operating_systems

### Community 37 - "properties"
Cohesion: 0.02
Nodes (111): Communities (149 total, 30 thin omitted), Community 0 - "compatibility.ts", Community 104 - "Phase 02 Plan 01: First Real AWS Publication Bootstrap Summary", Community 105 - "Phase 02 Plan 02: GitHub Environments Summary", Community 106 - "dependencies", Community 107 - "Phase 02 Plan 04: Deploy Pipeline Hardening + Live Verification Summary", Community 108 - "check-live-deployment.ts", Community 109 - "Phase 02 Plan 05: Infrastructure Plan-Job PUB-06 Proof Summary" (+103 more)

### Community 38 - "User Constraints"
Cohesion: 0.29
Nodes (7): Claude's Discretion, Deferred / OUT OF SCOPE, Locked Decisions — ADR-0001 (`docs/adr/0001-compatibility-scaffold.md`, `locked: true`), Locked Decisions — ADR-0002 (`docs/adr/0002-github-environment-model.md`, `locked: true`), Locked Decisions — ADR-0003 (`docs/adr/0003-infrastructure-iam-role-ownership.md`, `locked: true`), Standing project constraints (`.planning/PROJECT.md`), User Constraints

### Community 39 - "serve-static-build.ts"
Cohesion: 0.29
Nodes (4): buildRoot, contentTypes, port, server

### Community 40 - "environment-roots.test.ts"
Cohesion: 0.29
Nodes (3): environments, tagChecker, temporaryDirectories

### Community 41 - "Code Examples"
Cohesion: 0.33
Nodes (6): Code Examples, Pattern 1 — trust policy, one subject, no wildcard (INFRA-01), Pattern 2 — plan-role state access, lock-scoped writes only (INFRA-02), Pattern 3 — the `tofu test` file that discharges GATE-01, Pattern 4 — outputs (INFRA-04), Pattern 5 — verified apply-role scoping levers

### Community 42 - "security.md"
Cohesion: 0.33
Nodes (5): Credential ownership, Forge and entitlement boundary, Future PCP trust boundaries, Redaction and reporting, SSH host verification

### Community 44 - "Conflict Detection Report"
Cohesion: 0.40
Nodes (4): BLOCKERS (0), Conflict Detection Report, INFO (8), WARNINGS (0)

### Community 45 - "Decisions"
Cohesion: 0.40
Nodes (4): ADR-0001: Ship an empty, evidence-bearing compatibility registry, ADR-0002: Six GitHub Environments, three OpenTofu environments, ADR-0003: The bootstrap root owns the infrastructure plan and apply roles, Decisions

### Community 46 - "Validation Architecture"
Cohesion: 0.40
Nodes (5): Phase Requirements → Test Map, Sampling Rate, Test Framework, Validation Architecture, Wave 0 Gaps

### Community 47 - "getting-started.md"
Cohesion: 0.40
Nodes (4): Before you begin, Current execution path, Next steps, Puppet Console boundary

### Community 48 - "items"
Cohesion: 0.18
Nodes (10): Community Hubs (Navigation), Corpus Check, God Nodes (most connected - your core abstractions), Graph Freshness, Graph Report - stagehand-docs  (2026-08-26), Import Cycles, Knowledge Gaps, Suggested Questions (+2 more)

### Community 49 - "redirect.js"
Cohesion: 0.83
Nodes (3): encodeQueryString(), handler(), redirect()

### Community 50 - "Standard Stack"
Cohesion: 0.50
Nodes (4): Alternatives Considered, Core, Standard Stack, Supporting

### Community 51 - "Sources"
Cohesion: 0.50
Nodes (4): Primary (HIGH confidence), Secondary (MEDIUM confidence), Sources, Tertiary (LOW confidence)

### Community 52 - "check-built-routes.ts"
Cohesion: 0.50
Nodes (3): buildRoot, missing, requiredOutputs

### Community 56 - "Third-party notices"
Cohesion: 0.50
Nodes (3): IBM Plex Mono, IBM Plex Sans, Third-party notices

### Community 61 - "Security Domain"
Cohesion: 0.67
Nodes (3): Applicable ASVS Categories, Known Threat Patterns for OpenTofu-managed GitHub-OIDC CI roles, Security Domain

### Community 62 - "check-e2e-build-isolation.ts"
Cohesion: 0.24
Nodes (10): asLeakCheckRecord(), CompatibilityOutput, fixtureSources, LeakCheckRecord, leaked, loadForbiddenSets(), readCompatibilityOutput(), CompatibilityDocument (+2 more)

### Community 64 - "compatibility.ts"
Cohesion: 0.12
Nodes (15): Accomplishments, Actuals (#2632), Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered, Negative Proof (recorded per plan instruction) (+7 more)

### Community 65 - "Phase 01 Plan 04: Runbook and ADR Drift Reconciliation Summary"
Cohesion: 0.12
Nodes (15): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+7 more)

### Community 66 - "properties"
Cohesion: 0.25
Nodes (8): properties, minLength, type, platform, status, tier, enum, enum

### Community 68 - "items"
Cohesion: 0.40
Nodes (5): additionalProperties, required, records, items, type

### Community 69 - "Goal Achievement"
Cohesion: 0.15
Nodes (12): 1. Read both operations runbooks end to end as a first-time operator, Anti-Patterns Found, Behavioral Spot-Checks / Command Re-Execution, Gaps Summary, Goal Achievement, Human Verification Required, INFRA-05 prose-intent assessment (this verifier's own read, not a substitute for the required human sign-off), Key Link Verification (+4 more)

### Community 70 - "Phase 2: First Real Publication - Research"
Cohesion: 0.04
Nodes (46): Alternatives Considered, Anti-Patterns to Avoid, Applicable ASVS Categories, Architectural Responsibility Map, Architecture Patterns, Assumptions Log, Code Examples, Common Pitfalls (+38 more)

### Community 71 - "docs_path"
Cohesion: 0.67
Nodes (3): pattern, type, docs_path

### Community 88 - "e2e-build-isolation.test.ts"
Cohesion: 0.40
Nodes (3): checker, e2e, scale

### Community 90 - "evidence_url"
Cohesion: 0.67
Nodes (3): format, type, evidence_url

### Community 91 - "id"
Cohesion: 0.67
Nodes (3): minLength, type, id

### Community 92 - "last_verified"
Cohesion: 0.67
Nodes (3): format, type, last_verified

### Community 93 - "platform"
Cohesion: 0.12
Nodes (15): Accomplishments, Actuals (#2632), CONT-06 Boundary Sweep — Reproducible Commands and Output, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+7 more)

### Community 94 - "provider"
Cohesion: 0.67
Nodes (3): provider, minLength, type

### Community 95 - "puppet_versions"
Cohesion: 0.67
Nodes (3): puppet_versions, minLength, type

### Community 96 - "transport"
Cohesion: 0.67
Nodes (3): transport, minLength, type

### Community 97 - "Phase 2: First Real Publication - Context"
Cohesion: 0.17
Nodes (11): AWS identity for real applies, Canonical References, Claude's Discretion, Deferred Ideas, DNS cutover sequencing (risk-driven), Implementation Decisions, Operational docs, Phase 2: First Real Publication - Context (+3 more)

### Community 98 - "dependencies"
Cohesion: 0.25
Nodes (7): Manual-Only Verifications, Per-Task Verification Map, Phase 2 — Validation Strategy, Sampling Rate, Test Infrastructure, Validation Sign-Off, Wave 0 Requirements

### Community 104 - "Phase 02 Plan 01: First Real AWS Publication Bootstrap Summary"
Cohesion: 0.15
Nodes (12): Accomplishments, Auto-fixed Issues, Decisions Made, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness, Performance (+4 more)

### Community 105 - "Phase 02 Plan 02: GitHub Environments Summary"
Cohesion: 0.15
Nodes (12): Accomplishments, Auto-fixed Issues, Decisions Made, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness, Performance (+4 more)

### Community 106 - "dependencies"
Cohesion: 0.18
Nodes (10): Accomplishments, Decisions Made, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness, Performance, Phase 2 Plan 3: Apply testpilots for real Summary (+2 more)

### Community 107 - "Phase 02 Plan 04: Deploy Pipeline Hardening + Live Verification Summary"
Cohesion: 0.13
Nodes (14): Accomplishments, Auto-fixed Issues (carried from prior session, Rule 1), Blocker: Landing the fix on `main` requires human action, Decisions Made, Deviations from Plan, Files Created/Modified, Next Phase Readiness, Out of Scope (deferred, not fixed, this session) (+6 more)

### Community 108 - "check-live-deployment.ts"
Cohesion: 0.19
Nodes (12): Check, FetchLike, requiredRoutes, verifyLiveDeployment(), VerifyLiveDeploymentOptions, wait(), withRetry(), buildFetchStub() (+4 more)

### Community 109 - "Phase 02 Plan 05: Infrastructure Plan-Job PUB-06 Proof Summary"
Cohesion: 0.15
Nodes (12): Accomplishments, Decisions Made, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness, Performance, Phase 02 Plan 05: Infrastructure Plan-Job PUB-06 Proof Summary (+4 more)

### Community 110 - "ADR-0004: Self-review permitted on plan Environments for a solo maintainer"
Cohesion: 0.25
Nodes (7): ADR-0004: Self-review permitted on plan Environments for a solo maintainer, Alternatives rejected, Consequences, Context, Decision, References, Status

### Community 111 - "Goal Achievement"
Cohesion: 0.15
Nodes (12): Anti-Patterns Found, Behavioral Spot-Checks, Gaps Summary, Goal Achievement, Human Verification Required, Key Link Verification, Notable Items (informational, not blocking), Observable Truths (ROADMAP Success Criteria, cross-referenced with PLAN must_haves) (+4 more)

### Community 112 - "Phase 3 — UI Design Contract"
Cohesion: 0.12
Nodes (16): Accessibility Requirements (CONT-07), Checker Sign-Off, Color, Copywriting Contract, Design System, Docs (`/docs/` index + `/docs/[...slug]/`), Forbidden Patterns (CONT-06), Home (`/`) (+8 more)

### Community 113 - "Phase 03 Plan 02: GATE-03 Invalidation Coverage Checker Summary"
Cohesion: 0.12
Nodes (16): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+8 more)

### Community 114 - "check-invalidation-coverage.ts"
Cohesion: 0.60
Nodes (4): collectBuiltRoutes(), CoverageLists, findMissingInvalidationPaths(), parseInvalidationPaths()

### Community 120 - "Phase 3 Plan 1: Real Documentation Content — First-Run Tracer Summary"
Cohesion: 0.12
Nodes (16): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Interactive Tracer Checkpoint (+8 more)

### Community 121 - "first-run.md"
Cohesion: 0.33
Nodes (5): Before your first run, Confirming a successful first run, If your first run fails, Next, What a first run does

### Community 122 - "Phase 3 Plan 3: Real Documentation Content — Home, Tiers, Support Summary"
Cohesion: 0.13
Nodes (14): Accomplishments, Actuals (#2632), Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness (+6 more)

### Community 123 - "compatibility.ts"
Cohesion: 0.13
Nodes (14): Accessibility Requirements (COMP-04, GATE-04), Checker Sign-Off, Color, Compatibility (`/compatibility/`), Copywriting Contract, Design System, Forbidden Patterns, Page-Specific Contracts (+6 more)

### Community 124 - "Goal Achievement"
Cohesion: 0.17
Nodes (11): Anti-Patterns Found, Behavioral Spot-Checks, Data-Flow Trace (Level 4), Gaps Summary, Goal Achievement, Human Verification Required, Key Link Verification, Observable Truths (+3 more)

### Community 125 - "Phase 4: Evidence-Bearing Compatibility Register - Research"
Cohesion: 0.05
Nodes (42): Alternatives Considered, Anti-Patterns to Avoid, Applicable ASVS Categories, Architectural Responsibility Map, Architecture Patterns, Assumptions Log, Code Examples, Common Pitfalls (+34 more)

### Community 126 - "Phase 4 — Validation Strategy"
Cohesion: 0.25
Nodes (7): Manual-Only Verifications, Per-Task Verification Map, Phase 4 — Validation Strategy, Sampling Rate, Test Infrastructure, Validation Sign-Off, Wave 0 Requirements

### Community 127 - "04-01-PLAN.md"
Cohesion: 0.50
Nodes (3): Artifacts This Plan Produces, STRIDE Threat Register, Trust Boundaries

### Community 128 - "04-02-PLAN.md"
Cohesion: 0.50
Nodes (3): Artifacts This Plan Produces, STRIDE Threat Register, Trust Boundaries

### Community 129 - "04-03-PLAN.md"
Cohesion: 0.50
Nodes (3): Artifacts This Plan Produces, STRIDE Threat Register, Trust Boundaries

### Community 130 - "04-04-PLAN.md"
Cohesion: 0.50
Nodes (3): Artifacts This Plan Produces, STRIDE Threat Register, Trust Boundaries

### Community 131 - "platform"
Cohesion: 0.17
Nodes (11): dataPath, e2eDataPath, e2eValidationDate, loadCompatibility(), LoadCompatibilityOptions, scaleDataPath, scaleValidationDate, schemaPath (+3 more)

### Community 132 - "04-05-PLAN.md"
Cohesion: 0.50
Nodes (3): Artifacts This Plan Produces, STRIDE Threat Register, Trust Boundaries

### Community 133 - "04-06-PLAN.md"
Cohesion: 0.50
Nodes (3): Artifacts This Plan Produces, STRIDE Threat Register, Trust Boundaries

### Community 134 - "Phase 4 Plan 05: Untokenized Color and DRIFT-04 Spec Amendments Summary"
Cohesion: 0.15
Nodes (12): Accomplishments, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness, Performance (+4 more)

### Community 135 - "../../components/CompatibilityMatrix.astro"
Cohesion: 0.25
Nodes (8): ../../components/CompatibilityMatrix.astro, ../../components/TierCard.astro, presentations, StatusPresentation, SupportStatus, Tier, ../lib/data/status, ../lib/data/types

### Community 136 - "index.astro"
Cohesion: 0.14
Nodes (13): Accomplishments, Actuals (#2632), Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness (+5 more)

### Community 137 - "index.astro"
Cohesion: 0.50
Nodes (3): ../../components/CompatibilityEmptyState.astro, records, ../../lib/data/compatibility

### Community 138 - "loadYaml"
Cohesion: 0.15
Nodes (12): Accomplishments, Auto-fixed Issues, Decisions Made, Deviations from Plan, Files Created/Modified, Issues Encountered, Next Phase Readiness, Performance (+4 more)

### Community 139 - "stagehand_versions"
Cohesion: 0.13
Nodes (14): Accomplishments, Auto-fixed Issues, Decisions Made, Deviations from Plan, Files Created/Modified, Full `npm run verify` Evidence (Task 1), Issues Encountered, Next Phase Readiness (+6 more)

### Community 140 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, ajv, ajv-formats, astro, bootstrap, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, sass (+1 more)

### Community 141 - "package.json"
Cohesion: 0.25
Nodes (7): engines, node, npm, name, private, type, version

### Community 142 - "prettier"
Cohesion: 0.50
Nodes (4): prettier, plugins, printWidth, singleQuote

### Community 143 - "loadYaml"
Cohesion: 0.12
Nodes (15): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+7 more)

### Community 145 - "Phase 4 Plan 3: GATE-04 Realistic-Volume Assertions Summary"
Cohesion: 0.13
Nodes (14): Accomplishments, Actuals (#2632), Auto-fixed Issues, Decisions Made, Dependency graph, Deviations from Plan, Files Created/Modified, Issues Encountered (+6 more)

### Community 147 - "Goal Achievement"
Cohesion: 0.18
Nodes (10): Anti-Patterns Found, Behavioral Spot-Checks, Data-Flow Trace (Level 4), Gaps Summary, Goal Achievement, Human Verification Required, Key Link Verification, Observable Truths (ROADMAP Success Criteria) (+2 more)

### Community 148 - "stagehand_versions"
Cohesion: 0.04
Nodes (48): Alternatives Considered, Anti-Patterns to Avoid, Applicable ASVS Categories, Architectural Responsibility Map, Architecture Patterns, Assumptions Log, Claude's Discretion, Code Examples (+40 more)

### Community 149 - "Phase 5: Production Launch - Context"
Cohesion: 0.10
Nodes (19): Canonical References, Claude's Discretion, Deferred Ideas, DNS cutover blast radius (the central decision for this phase), Established Patterns, Existing Code Insights, GATE-05 wiring, Implementation Decisions (+11 more)

### Community 150 - "Phase 5: Production Launch - Discussion Log"
Cohesion: 0.25
Nodes (7): Claude's Discretion, Deferred Ideas, DNS cutover blast radius, GATE-05 wiring, Phase 5: Production Launch - Discussion Log, Release evidence format, Security advisory delivery

### Community 151 - "stagehand_versions"
Cohesion: 0.67
Nodes (3): stagehand_versions, minLength, type

## Knowledge Gaps
- **1135 isolated node(s):** `template`, `context`, `name`, `version`, `private` (+1130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Communities (149 total, 30 thin omitted)` connect `properties` to `items`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `properties` connect `properties` to `transport`, `type`, `items`, `docs_path`, `stagehand_versions`, `evidence_url`, `id`, `last_verified`, `provider`, `puppet_versions`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `template`, `context`, `name` to the rest of the system?**
  _1135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compatibility.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.04625346901017576 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._