var window = require('global');

function VineHill() {
  this.appDNS = {};
}

VineHill.prototype.add = function(host, app) {
  if (Object.keys(this.appDNS).length === 0) this.setOrigin(host);
  this.appDNS[host] = app;
  return this;
}

VineHill.prototype.getOrigin = function(url) {
  var origin = url.match(/^(https?:\/\/.*?)\/.*/i);
  if (origin) {
    return origin[1];
  }
  return this.defaultOrigin;
}

VineHill.prototype.start = function() {
  var self = this;
  var appDNS = this.appDNS;
  if (Object.keys(appDNS).length === 0) {
    throw new Error('You must add at least one host `vinehill.add("http://localhost:8080", connect())`');
  }

  function makeMiddleware(before) {
    var vinehillMiddleware = function(req){
      var origin = self.getOrigin(req.url);
      var requestApp = appDNS[origin];
      if (!requestApp) {
        throw new Error(`No app exists to listen to requests for ${origin}`);
      }

      return new Promise(function(success){
        var request = {
          url: req.url,
          method: req.method,
          body: req.body,
          headers: req.headers,
          _readableState: {},
          socket: {},
        };

        var headers = {};
        var responseHandler = {
          _removedHeader: {},
          get(name){
            return headers[name.toLowerCase()];
          },
          setHeader(name, value){
            headers[name.toLowerCase()] = value;
          },
          end: function(chunk, encoding){
            var body = chunk;
            if (chunk instanceof Buffer) {
              body = chunk.toString(encoding);
            }
            success({
              headers: headers,
              body: body
            });
          }
        };

        requestApp.handle(request, responseHandler);
      });
    };
    vinehillMiddleware.before = [before];
    vinehillMiddleware.middleware = 'vinehill';
    return vinehillMiddleware;
  }

  require('httpism').removeMiddleware('vinehill');
  require('httpism').insertMiddleware(makeMiddleware('http'));
  require('httpism/browser').removeMiddleware('vinehill');
  require('httpism/browser').insertMiddleware(makeMiddleware('send'));

  window.location = window.location || {};
  window.location.pathname = window.location.pathname || '/';
  window.location.origin = window.location.origin || '';
}

VineHill.prototype.setOrigin = function(host) {
  this.defaultOrigin = host;
}

VineHill.prototype.stop = function() {
  this.defaultOrigin = null;
  this.appDNS = {};
}

module.exports = VineHill;
