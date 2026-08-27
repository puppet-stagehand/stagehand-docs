import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const template = readFileSync(new URL('../functions/redirect.js', import.meta.url), 'utf8');

function loadFunction(apexRedirectEnabled) {
  const context = vm.createContext({});
  const source = template.replace('__ENABLE_APEX_REDIRECT__', String(apexRedirectEnabled));
  vm.runInContext(source, context);
  return context;
}

const context = loadFunction(true);

function request(uri, host, querystring = {}) {
  return {
    request: {
      uri,
      headers: { host: { value: host } },
      querystring,
    },
  };
}

test('stable apex redirect preserves the URI and query string', () => {
  const result = context.handler(
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

test('stable apex redirect compares the host case-insensitively', () => {
  const result = context.handler(request('/tiers/', 'Puppet-Stagehand.COM'));

  assert.equal(result.statusCode, 301);
  assert.equal(result.headers.location.value, 'https://www.puppet-stagehand.com/tiers/');
});

test('extensionless paths redirect to a trailing slash and preserve query', () => {
  const result = context.handler(
    request('/guides/install', 'beta.puppet-stagehand.com', {
      source: { value: 'nav' },
    }),
  );

  assert.equal(result.statusCode, 301);
  assert.equal(result.headers.location.value, '/guides/install/?source=nav');
});

test('trailing-slash paths are rewritten to index.html for the origin', () => {
  const event = request('/guides/install/', 'beta.puppet-stagehand.com');
  const result = context.handler(event);

  assert.equal(result.uri, '/guides/install/index.html');
});

test('requests with file extensions pass through unchanged', () => {
  const event = request('/assets/app.css', 'beta.puppet-stagehand.com');
  const result = context.handler(event);

  assert.equal(result.uri, '/assets/app.css');
});

test('disabled apex behavior does not redirect the apex host to www', () => {
  const disabledContext = loadFunction(false);
  const result = disabledContext.handler(request('/', 'puppet-stagehand.com'));

  assert.equal(result.uri, '/index.html');
});
