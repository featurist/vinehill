var window = require('global');
var MockXMLHttpRequest = require('./lib/MockXMLHttpRequest');
var MockResponse = require('./lib/MockResponse');

var appDNS = {};
var defaultOrigin;

function getOrigin(url) {
  var origin = url.match(/^(https?:\/\/.*?)\/.*/i);
  if (origin) {
    return origin[1];
  }
  return defaultOrigin;
}

module.exports = function(url, app) {
  window.location = window.location || {};
  window.location.pathname = window.location.pathname || '/';
  window.location.origin = window.location.origin || '';

  appDNS[url] = app;

  window.XMLHttpRequest = function() {
    var requestStack = new Error().stack;
    var xhr = new MockXMLHttpRequest();
    xhr.sendToServer = function(req) {
      var origin = getOrigin(req._url);
      if (!origin) {
        throw new Error('Use `setOrigin` to make requests without a host');
      }
      var requestApp = appDNS[origin];
      if (!requestApp) {
        var noAppError = new Error(`No app exists to listen to requests for ${origin}`);
        noAppError.stack = requestStack;
        throw noAppError;
      }

      return new Promise(function(success){
        var response = new MockResponse();
        var request = {
          url: req._url,
          method: req._method,
          body: req._body,
        };
        var responseHandler = {
          get(name){
            return response.header(name);
          },
          setHeader(name, value){
            response.header(name, value);
          },
          end: function(chunk, encoding){
            var body = chunk;
            if (chunk instanceof Buffer) {
              body = chunk.toString(encoding);
            }
            response.body(body);
            success(response);
          }
        };

        requestApp.handle(request, responseHandler);
      });
    }
    return xhr;
  }
}

module.exports.setOrigin = function(url) {
  defaultOrigin = url;
}

module.exports.reset = function(){
  defaultOrigin = null;
  appDns = {};
}
