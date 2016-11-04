var window = require('global');
var MockXMLHttpRequest = require('./lib/MockXMLHttpRequest');
var MockResponse = require('./lib/MockResponse');

var appDNS = {};

function getOrigin(url) {
  return url.match(/^(https?:\/\/.*?)\/.*/i)[1];
}

module.exports = function(url, app) {
  window.location = {
    origin: ''
  }

  appDNS[url] = app;

  window.XMLHttpRequest = function() {
    var requestStack = new Error().stack;
    var xhr = new MockXMLHttpRequest();
    xhr.sendToServer = function(req) {
      var origin = getOrigin(req._url);
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
