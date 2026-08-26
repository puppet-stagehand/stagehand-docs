## Conflict Detection Report

Mode: new. Precedence: ADR > SPEC > PRD > DOC.
Ingest set: 12 classified documents (3 ADR, 3 SPEC, 6 DOC, 0 PRD).
Cross-ref graph: acyclic, max traversal depth 4 (cap 50).

### BLOCKERS (0)

No blockers detected.

LOCKED-vs-LOCKED check performed pairwise across all three locked ADRs
(docs/adr/0001-compatibility-scaffold.md, docs/adr/0002-github-environment-model.md,
docs/adr/0003-infrastructure-iam-role-ownership.md). No contradicting decision statements were
found on any shared scope. ADR-0002 rule 3 (six GitHub Environments) and ADR-0003 rule 2 (six
roles, one per environment per tier, each trusting exactly one Environment subject) are mutually
consistent: 3 OpenTofu environments x 2 tiers = 6 roles binding to 6 GitHub Environments.
ADR-0002 rule 4 (no pull-request-triggered workflow reaches a mutating role) and ADR-0003 rule 1
(bootstrap creates a read-only plan role and a dispatch-gated apply role) are consistent.
ADR-0001 shares no scope with either.

No UNKNOWN classifications and no low-confidence classifications were present.

### WARNINGS (0)

No competing variants detected. Zero PRD-classified documents were ingested, so no divergent
acceptance criteria exist to preserve.

The three WARNINGs raised by the previous ingest run over this repository minus the ADRs were each
independently re-verified against the source documents and the repository working tree, not
assumed resolved. All three are now resolved by locked ADRs at ADR precedence and are recorded as
INFO entries below with their verification evidence. Residual documentation drift found during
verification is also recorded as INFO; none of it leaves an outcome undetermined, because in each
case a locked ADR states the governing rule explicitly.

### INFO (8)

[INFO] Auto-resolved: ADR-0001 > SPEC on compatibility scaffold data
  Found: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md delivery boundary declares
    the scaffold complete when the repository contains "representative content and compatibility
    data"; docs/operations/compatibility-claims.md requires every record to link a primary evidence
    source and carry a truthful last_verified date; docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
    Task 3 Step 4 seeds "an intentionally empty compatibility claim list". Two of the three are
    SPEC-class at equal precedence, so precedence alone could not break the tie.
  Note: docs/adr/0001-compatibility-scaffold.md (locked, Accepted) resolves this. Rule 1 ships the
    published registry empty, rule 2 confines representative records to test fixtures, rule 3
    upholds the evidence policy unweakened, and rule 4 makes the empty state a supported rendering.
    The ADR explicitly amends the design specification's delivery boundary so that "representative
    compatibility data" means fixture data plus a rendered empty state. LOCKED beats non-locked SPEC.
    Verified independently against the working tree: src/data/compatibility.yaml contains exactly
    "schema_version: 1" and "records: []"; tests/fixtures/data/compatibility-e2e.yaml contains
    exactly 5 records; src/components/CompatibilityEmptyState.astro exists; and
    scripts/check-e2e-build-isolation.ts throws unless the production compatibility output has 0
    records and the e2e output has 5. Every factual claim in the ADR's Context section checks out.

[INFO] ADR-0001 amendment names the delivery boundary only; two adjacent spec sentences are unedited
  Found: docs/adr/0001-compatibility-scaffold.md amends "the design specification's delivery
    boundary". Two other statements in docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
    remain literally unamended: the success criterion "Product tiers and compatibility claims are
    customer-facing and generated from schema-validated structured data", and the site-architecture
    sentence "The initial scaffold includes representative content for every route".
  Note: No outcome is undetermined — ADR-0001 rules 1 and 4 govern both readings at locked ADR
    precedence, and the ADR's References section shows it considered the success criteria. This is
    recorded so that a later editor of the design specification amends all three sentences together
    rather than only the delivery boundary. Both statements are carried in intel/constraints.md with
    the ADR-0001 override attached.

[INFO] Auto-resolved: ADR-0002 > SPEC on GitHub Environment count and naming
  Found: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md global constraints state without
    qualification "Environment names are exactly testpilots, beta, and stable";
    docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md states "GitHub Environments are
    named testpilots, beta, and stable"; docs/operations/github-environments.md instructs the
    administrator to create six Environments (testpilots, beta, stable, testpilots-plan, beta-plan,
    stable-plan).
  Note: docs/adr/0002-github-environment-model.md (locked, Accepted) resolves this. Rule 1 separates
    three namespaces, rule 2 scopes the three-value enum to var.environment and the environment tag
    only, rule 3 declares six GitHub Environments with their branch policies and variable split, and
    rule 4 states the plan/apply privilege separation as a security control. LOCKED beats non-locked
    SPEC and DOC. Verified independently against the working tree: infra/modules/static-site/variables.tf
    validates var.environment with contains(["testpilots", "beta", "stable"], var.environment);
    .github/workflows/infrastructure.yml attaches matrix plan_environment values testpilots-plan,
    beta-plan, and stable-plan on pull_request behind a same-repository head-repo guard, and attaches
    inputs.environment on workflow_dispatch gated on github.ref == 'refs/heads/main' and
    inputs.confirmation == 'apply'. The implementation matches rule 3 and rule 4.

[INFO] ADR-0002 rule 2 amends the plan only; the design spec's GitHub Environment sentence is untouched
  Found: docs/adr/0002-github-environment-model.md Context states that the design specification "is
    already precise" and "does not forbid the plan Environments", characterising it only through its
    var.environment scoping and its environment table. The design specification also contains a
    separate sentence in its "GitHub and deployment flow" section — "GitHub Environments are named
    testpilots, beta, and stable" — which is about the GitHub Environment namespace, not
    var.environment, and which does read as a closed enumeration. ADR-0002 rule 2 amends only "the
    implementation plan's global constraint".
  Note: No outcome is undetermined — ADR-0002 rule 3 states the six-Environment model explicitly at
    locked ADR precedence, and github-environments.md plus the live workflow agree with it. This is
    recorded because the ADR's Context slightly understates the contradiction it is resolving, and
    because a later editor working from rule 2 alone would amend the implementation plan and leave
    the design specification sentence in place. That sentence is carried verbatim in
    intel/constraints.md under "GitHub Environment naming (design specification)" with the ADR-0002
    override attached.

[INFO] Auto-resolved: ADR-0003 settles ownership of the infrastructure plan and apply IAM roles
  Found: .github/workflows/infrastructure.yml consumes vars.AWS_INFRASTRUCTURE_PLAN_ROLE_ARN and
    vars.AWS_INFRASTRUCTURE_APPLY_ROLE_ARN; docs/operations/github-environments.md and
    docs/operations/aws-bootstrap.md both state that neither the bootstrap nor the site stack creates
    these roles and direct an administrator to provision them by hand; docs/adr/0002-github-environment-model.md
    explicitly declined to settle their ownership. The least-privilege design existed only at DOC
    precedence, owned by no deliverable.
  Note: docs/adr/0003-infrastructure-iam-role-ownership.md (locked, Accepted) resolves the ownership
    question. Rule 1 assigns both roles to infra/bootstrap/ as OpenTofu resources with their ARNs as
    outputs; rule 2 fixes six roles, one per environment per tier, each trusting exactly one GitHub
    Environment subject with no wildcards; rule 3 elevates the permission scoping in
    docs/operations/github-environments.md to the specification the OpenTofu must satisfy; rule 4
    keeps bootstrap human-applied. Verified independently against the working tree: infra/bootstrap/
    currently declares only aws_s3_bucket.state and its supporting resources plus
    aws_iam_openid_connect_provider.github, with outputs github_oidc_provider_arn and
    state_bucket_names; infra/modules/static-site/iam.tf declares only aws_iam_role.deploy and its
    policy; CODEOWNERS assigns /infra/ and /.github/workflows/ to @matthewrstone. Every factual claim
    in the ADR's Context section checks out, including the non-circularity argument that CI never
    applies the bootstrap root.

[INFO] ADR-0003 rule 1 is an accepted decision, not yet an implemented one
  Found: infra/bootstrap/ contains no IAM role resources for the plan or apply tiers. ADR-0003 rule 5
    states that implementation is a separate task and that the manual provisioning path in
    docs/operations/github-environments.md remains the operative instruction and must not be deleted.
  Note: This is a deliberate, ADR-sanctioned interim state rather than a contradiction, so it is not
    a blocker. It is a downstream planning input: implementing rule 1 requires six OpenTofu role
    resources plus outputs in infra/bootstrap/, and requires updating both
    docs/operations/github-environments.md and docs/operations/aws-bootstrap.md, each of which
    currently instructs manual provisioning. Recorded in intel/decisions.md as an open implementation
    task under ADR-0003.

[INFO] ADR-0002's forward pointer for role ownership is now stale
  Found: the References section of docs/adr/0002-github-environment-model.md states that ownership of
    AWS_INFRASTRUCTURE_PLAN_ROLE_ARN and AWS_INFRASTRUCTURE_APPLY_ROLE_ARN "is not settled by this
    ADR" and directs the reader to docs/operations/github-environments.md "until a separate ADR
    records an owner". docs/adr/0003-infrastructure-iam-role-ownership.md, dated the same day, is that
    ADR, and it references ADR-0002 in return; ADR-0002 does not reference ADR-0003.
  Note: Cross-reference hygiene only. ADR-0003 supersedes the pointer's condition. Adding a reference
    to ADR-0003 from ADR-0002 would close the loop without changing any decision.

[INFO] No PRD-class input; requirements intel is intentionally empty
  Found: the ingest set contains zero PRD-classified documents. Requirement-shaped material exists in
    SPEC-classified sources — the success criteria, non-goals, and delivery boundary in
    docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md, and the per-task interface
    contracts in docs/superpowers/plans/2026-08-22-stagehand-docs-site.md.
  Note: That material was routed to intel/constraints.md under its own document type rather than
    converted into REQ- entries, so nothing was invented. intel/requirements.md records the absence
    and points at the constraint entries that carry the requirement-shaped content. Downstream
    requirement authoring must derive from intel/constraints.md and intel/decisions.md.
