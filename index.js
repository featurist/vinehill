var window = require('global');
var MockXMLHttpRequest = require('./lib/MockXMLHttpRequest');
var MockResponse = require('./lib/MockResponse');

function VineHill() {
  this.appDNS = {};
}

VineHill.prototype.add = function(host, app) {
  if (Object.keys(this.appDNS).length === 0) this.setOrigin(host);
  this.appDNS[host] = app;
}

VineHill.prototype.getOrigin = function(url) {
  var origin = url.match(/^(https?:\/\/.*?)\/.*/i);
  if (origin) {
    return origin[1];
  }
  return this.defaultOrigin;
}

VineHill.prototype.start = function(url, app) {
  var self = this;
  window.location = window.location || {};
  window.location.pathname = window.location.pathname || '/';
  window.location.origin = window.location.origin || '';

  window.XMLHttpRequest = function() {
    var requestStack = new Error().stack;
    var xhr = new MockXMLHttpRequest();
    xhr.sendToServer = function(req) {
      if (Object.keys(self.appDNS).length === 0) {
        throw new Error('You must add at least one host `vinehill.add("http://localhost:8080", connect())`');
      }
      var origin = self.getOrigin(req._url);
      var requestApp = self.appDNS[origin];
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
          headers: req._headers,
          _readableState: {},
          socket: {},
        };
        var responseHandler = {
          _removedHeader: {},
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

VineHill.prototype.setOrigin = function(host) {
  this.defaultOrigin = host;
}

VineHill.prototype.stop = function() {
  this.defaultOrigin = null;
  this.appDNS = {};
}

module.exports = VineHill;
