
## 04-02: built-link-policy.test.ts flaky under concurrent full-suite run

Observed `tests/unit/built-link-policy.test.ts` fail once during a full `npx vitest run tests/unit`
pass with `ENOENT: no such file or directory, rename '.astro/content-modules.mjs.tmp' -> '.astro/content-modules.mjs'`
— an Astro content-store race when multiple test files run real `astro build`s concurrently.
Re-running the file in isolation passed (10/10). Not caused by 04-02's changes (compatibility.ts /
check-e2e-build-isolation.ts); out of scope per SCOPE BOUNDARY. Not fixed here.
