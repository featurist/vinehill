var createDebug = require("debug");
var debug = createDebug("vinehill");
var debugResponse = createDebug("vinehill:response");
var debugRequest = createDebug("vinehill:request");


function isStream(body) {
  return body !== undefined && typeof body.pipe === 'function';
}


function removeUndefined(obj) {
  Object.keys(obj).map(function (key) {
    if (typeof obj[key] === 'undefined') {
      delete obj[key];
    }
  });

  return obj;
}

function prepareForLogging(request) {
  return removeUndefined({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: isStream(request.body)? '[Stream]': request.body,
    statusCode: request.statusCode,
    statusText: request.statusText
  });
}
module.exports = {
  debug: function(message) {
    debug(message)
  },

  main: function(message) {
    this.debug(message)
  },
  request: function(req) {
    this.debug(prepareForLogging(req))
  },
  response: function(res) {
    this.debug(prepareForLogging(res))
  }
}
