const requiredRoutes = [
  '/',
  '/tiers/',
  '/compatibility/',
  '/docs/',
  '/docs/getting-started/',
  '/docs/security/',
  '/docs/support/',
  '/support/',
  '/data/compatibility.json',
] as const;

const nonexistentRoutePath = '/this-route-does-not-exist/';
const brandedNotFoundMarker = 'Page Not Found';
const commitStampPath = '/deployed-commit.txt';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface VerifyLiveDeploymentOptions {
  siteUrl: string;
  expectedSha: string;
  fetchImpl?: FetchLike;
  maxAttempts?: number;
  retryDelayMs?: number;
  /** HTTP Basic Auth username, when the target environment's whole-site lockdown (enable_basic_auth) is on. */
  basicAuthUsername?: string;
  /** HTTP Basic Auth password, when the target environment's whole-site lockdown (enable_basic_auth) is on. */
  basicAuthPassword?: string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolveWait) => setTimeout(resolveWait, ms));

type Check = () => Promise<string | undefined>;

const withRetry = async (
  check: Check,
  maxAttempts: number,
  retryDelayMs: number,
): Promise<string | undefined> => {
  let lastFailure: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastFailure = await check();
    if (lastFailure === undefined) return undefined;
    if (attempt < maxAttempts) await wait(retryDelayMs);
  }
  return lastFailure;
};

export const verifyLiveDeployment = async ({
  siteUrl,
  expectedSha,
  fetchImpl = (url, init) => fetch(url, init),
  maxAttempts = 3,
  retryDelayMs = 3_000,
  basicAuthUsername,
  basicAuthPassword,
}: VerifyLiveDeploymentOptions): Promise<void> => {
  const baseUrl = siteUrl.replace(/\/+$/, '');

  // Whole-site HTTP Basic Auth lockdown (enable_basic_auth, distinct from the
  // path-scoped tester gate) applies to every route this script checks, so every
  // request must carry it when configured. Omitted entirely when unset — a site
  // with the lockdown off must not send a bogus/empty Authorization header.
  const requestInit: RequestInit | undefined =
    basicAuthUsername !== undefined && basicAuthPassword !== undefined
      ? { headers: { Authorization: `Basic ${btoa(`${basicAuthUsername}:${basicAuthPassword}`)}` } }
      : undefined;
  const authedFetch = (url: string) => fetchImpl(url, requestInit);

  const checkRoute =
    (path: string): Check =>
    async () => {
      const response = await authedFetch(`${baseUrl}${path}`);
      if (response.status !== 200) return `${path}: expected 200, got ${response.status}`;
      return undefined;
    };

  const checkBranded404: Check = async () => {
    const response = await authedFetch(`${baseUrl}${nonexistentRoutePath}`);
    if (response.status !== 404) {
      return `${nonexistentRoutePath}: expected 404, got ${response.status}`;
    }
    const body = await response.text();
    if (!body.includes(brandedNotFoundMarker)) {
      return `${nonexistentRoutePath}: 404 response body missing branded marker "${brandedNotFoundMarker}"`;
    }
    return undefined;
  };

  const checkCommitStamp: Check = async () => {
    const response = await authedFetch(`${baseUrl}${commitStampPath}`);
    if (response.status !== 200) {
      return `${commitStampPath}: expected 200, got ${response.status}`;
    }
    const body = (await response.text()).trim();
    if (body !== expectedSha) {
      return `${commitStampPath}: expected deployed commit ${expectedSha}, got ${body}`;
    }
    return undefined;
  };

  const checks: Check[] = [
    ...requiredRoutes.map((path) => checkRoute(path)),
    checkBranded404,
    checkCommitStamp,
  ];

  const failures: string[] = [];
  for (const check of checks) {
    const failure = await withRetry(check, maxAttempts, retryDelayMs);
    if (failure !== undefined) failures.push(failure);
  }

  if (failures.length > 0) {
    throw new Error(
      `Live deployment verification failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`,
    );
  }

  console.log(
    `Verified ${requiredRoutes.length} routes, the branded 404, and the deployed commit stamp at ${siteUrl}`,
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const siteUrl = process.env.SITE_URL;
  const expectedSha = process.env.EXPECTED_SHA;
  if (!siteUrl || !expectedSha) {
    console.error('SITE_URL and EXPECTED_SHA environment variables are required.');
    process.exit(1);
  }
  await verifyLiveDeployment({
    siteUrl,
    expectedSha,
    basicAuthUsername: process.env.BASIC_AUTH_USERNAME,
    basicAuthPassword: process.env.BASIC_AUTH_PASSWORD,
  });
}
