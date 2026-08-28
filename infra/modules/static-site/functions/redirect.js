import cf from 'cloudfront';

function encodeQueryString(querystring) {
  var pairs = [];
  var keys = Object.keys(querystring);

  for (var index = 0; index < keys.length; index += 1) {
    var key = keys[index];
    var parameter = querystring[key];
    var values = parameter.multiValue || [parameter];

    for (var valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(values[valueIndex].value));
    }
  }

  return pairs.length > 0 ? '?' + pairs.join('&') : '';
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: location },
    },
  };
}

function unauthorized() {
  return {
    statusCode: 401,
    statusDescription: 'Unauthorized',
    headers: {
      'www-authenticate': { value: 'Basic realm="Restricted", charset="UTF-8"' },
      'cache-control': { value: 'no-store' },
    },
  };
}

function isGatedPath(uri, prefixes) {
  for (var i = 0; i < prefixes.length; i += 1) {
    if (uri.indexOf(prefixes[i]) === 0) {
      return true;
    }
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- CloudFront invokes this global entry point.
async function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var query = encodeQueryString(request.querystring);
  var apexRedirectEnabled = __ENABLE_APEX_REDIRECT__;
  var basicAuthEnabled = __ENABLE_BASIC_AUTH__;
  var gatedPathPrefixes = __GATED_PATH_PREFIXES__;

  // The new KVS-backed tester gate and the pre-existing whole-site basicAuthEnabled
  // lockdown are mutually exclusive per request (if / else-if), never stacked on the
  // same path. Both mechanisms read the single shared Authorization header, and a
  // browser can only send one value, so evaluating both against the same header
  // would conflate two credentials that must stay separate (D-06). A gated path is
  // protected exclusively by the new tester password; every other path keeps the
  // pre-existing enable_basic_auth behavior, completely unaffected (D-05).
  if (isGatedPath(uri, gatedPathPrefixes)) {
    var gateAuthHeader = request.headers.authorization;
    if (!gateAuthHeader) {
      return unauthorized();
    }

    var expectedGateHeader;
    try {
      expectedGateHeader = await cf.kvs().get('gate_expected_header');
      // CloudFront Functions runtime compatibility keeps the catch binding explicit
      // rather than relying on optional catch binding (ES2019+); the error itself is
      // intentionally unused since the fail-closed behavior below is the same for
      // every failure mode.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see comment above
    } catch (error) {
      // Fail closed on any KVS outage, missing key, or unexpected runtime error —
      // never fall through to serving gated content (STRIDE T-04.1-02).
      return unauthorized();
    }

    if (gateAuthHeader.value !== expectedGateHeader) {
      return unauthorized();
    }
    // Match: fall through to the existing apex-redirect/clean-path logic below,
    // exactly as a basic-auth-passed request does today.
  } else if (basicAuthEnabled) {
    var authHeader = request.headers.authorization;
    if (!authHeader || authHeader.value !== '__BASIC_AUTH_EXPECTED_HEADER__') {
      return unauthorized();
    }
  }

  if (apexRedirectEnabled && request.headers.host.value.toLowerCase() === 'puppet-stagehand.com') {
    return redirect('https://www.puppet-stagehand.com' + uri + query);
  }

  var finalSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (uri.charAt(uri.length - 1) !== '/' && finalSegment.indexOf('.') === -1) {
    return redirect(uri + '/' + query);
  }

  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
  }

  return request;
}
