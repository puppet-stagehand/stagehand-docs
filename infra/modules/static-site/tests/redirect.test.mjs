import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const template = readFileSync(new URL('../functions/redirect.js', import.meta.url), 'utf8');

// AUTH-05 single-source-of-truth proof point: the test reads the exact same file
// Terraform compiles into the function — never a hand-typed duplicate of the gated
// path list.
const gatedPaths = JSON.parse(
  readFileSync(new URL('../gated-paths.json', import.meta.url), 'utf8'),
);

// A well-shaped fixture value for the KVS-stored expected Authorization header.
// Task 2's real implementation stores "Basic " + base64(":<password>") (empty
// username); the exact bytes don't matter to these tests, only that the gate does
// a strict string comparison against whatever value the mocked KVS lookup returns.
const gateExpectedHeader = 'Basic Z2F0ZTp0ZXN0ZXItc2VjcmV0';

function loadFunction(
  apexRedirectEnabled,
  basicAuthEnabled = false,
  gatedPathPrefixes = [],
  kvsValues = {},
) {
  const context = vm.createContext({
    // Mocks the CloudFront Functions `cloudfront` KVS module. `import cf from
    // 'cloudfront'` cannot be evaluated by `vm.runInContext` (see below), so the
    // real redirect.js's `cf.kvs().get(key)` calls resolve against this fixture
    // object instead. A missing key throws, simulating both a genuine lookup
    // failure and an absent key from one mock (Task 1 behavior spec).
    cf: {
      kvs: () => ({
        get: async (key) => {
          if (Object.prototype.hasOwnProperty.call(kvsValues, key)) {
            return kvsValues[key];
          }
          throw new Error(`gsd-test: no KVS fixture value for key "${key}"`);
        },
      }),
    },
  });
  const source = template
    // vm.runInContext cannot evaluate ES `import` syntax. Task 2 adds
    // `import cf from 'cloudfront';` as redirect.js's first line; strip it before
    // evaluating so the mocked `cf` global (above) is used instead.
    .replace("import cf from 'cloudfront';\n", '')
    .replace('__ENABLE_APEX_REDIRECT__', String(apexRedirectEnabled))
    .replace('__ENABLE_BASIC_AUTH__', String(basicAuthEnabled))
    .replace('__BASIC_AUTH_EXPECTED_HEADER__', 'Basic dGVzdDp0ZXN0')
    .replace('__GATED_PATH_PREFIXES__', JSON.stringify(gatedPathPrefixes));
  vm.runInContext(source, context);
  return context;
}

const context = loadFunction(true);

function request(uri, host, querystring = {}, headers = {}) {
  return {
    request: {
      uri,
      headers: { host: { value: host }, ...headers },
      querystring,
    },
  };
}

test('stable apex redirect preserves the URI and query string', async () => {
  const result = await context.handler(
    request('/guides/install/', 'puppet-stagehand.com', {
      ref: { value: 'docs' },
      topic: { value: 'clean paths' },
    }),
  );

  assert.equal(result.statusCode, 301);
  assert.equal(
    result.headers.location.value,
    'https://www.puppet-stagehand.com/guides/install/?ref=docs&topic=clean%20paths',
  );
});

test('stable apex redirect compares the host case-insensitively', async () => {
  const result = await context.handler(request('/tiers/', 'Puppet-Stagehand.COM'));

  assert.equal(result.statusCode, 301);
  assert.equal(result.headers.location.value, 'https://www.puppet-stagehand.com/tiers/');
});

test('extensionless paths redirect to a trailing slash and preserve query', async () => {
  const result = await context.handler(
    request('/guides/install', 'beta.puppet-stagehand.com', {
      source: { value: 'nav' },
    }),
  );

  assert.equal(result.statusCode, 301);
  assert.equal(result.headers.location.value, '/guides/install/?source=nav');
});

test('trailing-slash paths are rewritten to index.html for the origin', async () => {
  const event = request('/guides/install/', 'beta.puppet-stagehand.com');
  const result = await context.handler(event);

  assert.equal(result.uri, '/guides/install/index.html');
});

test('requests with file extensions pass through unchanged', async () => {
  const event = request('/assets/app.css', 'beta.puppet-stagehand.com');
  const result = await context.handler(event);

  assert.equal(result.uri, '/assets/app.css');
});

test('disabled apex behavior does not redirect the apex host to www', async () => {
  const disabledContext = loadFunction(false);
  const result = await disabledContext.handler(request('/', 'puppet-stagehand.com'));

  assert.equal(result.uri, '/index.html');
});

test('basic auth disabled by default allows requests through with no authorization header', async () => {
  const result = await context.handler(request('/tiers/', 'beta.puppet-stagehand.com'));

  assert.equal(result.uri, '/tiers/index.html');
});

test('basic auth enabled rejects a request with no authorization header', async () => {
  const authContext = loadFunction(false, true);
  const result = await authContext.handler(request('/tiers/', 'beta.puppet-stagehand.com'));

  assert.equal(result.statusCode, 401);
  assert.match(result.headers['www-authenticate'].value, /^Basic realm=/);
});

test('basic auth enabled rejects a request with the wrong credential', async () => {
  const authContext = loadFunction(false, true);
  const result = await authContext.handler(
    request(
      '/tiers/',
      'beta.puppet-stagehand.com',
      {},
      { authorization: { value: 'Basic wrong' } },
    ),
  );

  assert.equal(result.statusCode, 401);
});

test('basic auth enabled passes through a request with the correct credential', async () => {
  const authContext = loadFunction(false, true);
  const result = await authContext.handler(
    request(
      '/tiers/',
      'beta.puppet-stagehand.com',
      {},
      { authorization: { value: 'Basic dGVzdDp0ZXN0' } },
    ),
  );

  assert.equal(result.uri, '/tiers/index.html');
});

test('gated path with no authorization header is refused with a Basic challenge', async () => {
  const gatedContext = loadFunction(false, false, gatedPaths, {
    gate_expected_header: gateExpectedHeader,
  });
  const result = await gatedContext.handler(
    request('/docs/testers-guide/', 'testpilots.puppet-stagehand.com'),
  );

  assert.equal(result.statusCode, 401);
  assert.match(result.headers['www-authenticate'].value, /^Basic realm=/);
});

test('gated path with the wrong credential is refused', async () => {
  const gatedContext = loadFunction(false, false, gatedPaths, {
    gate_expected_header: gateExpectedHeader,
  });
  const result = await gatedContext.handler(
    request(
      '/docs/testers-guide/',
      'testpilots.puppet-stagehand.com',
      {},
      { authorization: { value: 'Basic d3Jvbmc6d3Jvbmc=' } },
    ),
  );

  assert.equal(result.statusCode, 401);
});

test('gated path with the correct credential passes through to clean-path logic', async () => {
  const gatedContext = loadFunction(false, false, gatedPaths, {
    gate_expected_header: gateExpectedHeader,
  });
  const result = await gatedContext.handler(
    request(
      '/docs/testers-guide/',
      'testpilots.puppet-stagehand.com',
      {},
      { authorization: { value: gateExpectedHeader } },
    ),
  );

  assert.equal(result.uri, '/docs/testers-guide/index.html');
});

test('gated path match is prefix-based and covers nested sub-paths', async () => {
  const gatedContext = loadFunction(false, false, gatedPaths, {
    gate_expected_header: gateExpectedHeader,
  });
  const result = await gatedContext.handler(
    request('/docs/testers-guide/setup', 'testpilots.puppet-stagehand.com'),
  );

  assert.equal(result.statusCode, 401);
});

test('non-gated path is unaffected by the new gate and still honors the pre-existing basic-auth lockdown', async () => {
  const authContext = loadFunction(false, true, gatedPaths, {});
  const result = await authContext.handler(request('/tiers/', 'beta.puppet-stagehand.com'));

  assert.equal(result.statusCode, 401);
  assert.match(result.headers['www-authenticate'].value, /^Basic realm=/);
});

test('gated path fails closed when the KVS lookup fails', async () => {
  const gatedContext = loadFunction(false, false, gatedPaths, {});
  const result = await gatedContext.handler(
    request(
      '/docs/testers-guide/',
      'testpilots.puppet-stagehand.com',
      {},
      { authorization: { value: gateExpectedHeader } },
    ),
  );

  assert.equal(result.statusCode, 401);
});
