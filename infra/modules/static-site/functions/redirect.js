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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- CloudFront invokes this global entry point.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var query = encodeQueryString(request.querystring);
  var apexRedirectEnabled = __ENABLE_APEX_REDIRECT__;

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
