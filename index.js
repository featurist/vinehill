var window = require('global');
var isNode = require('is-node');
var statusCodes = require('builtin-status-codes/browser')
var ReadableStream = require('stream').Readable;
if (!isNode) {
  var http = require('http');
  http.IncomingMessage = {};
  http.ServerResponse = {};
  http.Server = function() {}
  global.setImmediate = function(cb) {
    setTimeout(function(){
      cb.call(arguments)
    })
  }
}

function VineHill() {
  var self = this;
  this.appDNS = {};

  function makeMiddleware(before) {
    var vinehillMiddleware = function(req){
      var origin = self.getOrigin(req.url);
      var requestApp = self.appDNS[origin];
      if (!requestApp) {
        throw new Error('No app exists to listen to requests for '+origin);
      }

      if (before === 'send' && req.body && typeof req.body == 'string') {
        req.headers['content-length'] = req.body.length;
      }

      return new Promise(function(success){
        var bodyStream = new ReadableStream();
        bodyStream._read = function(){}

        var request = {
          url: req.url,
          method: req.method,
          body: bodyStream,
          headers: req.headers,
          _readableState: {},
          socket: {},
          connection: {},
          on: function(event, fn) {
            return this.body.on(event, fn);
          },
          removeListener: function noop(){},
          unpipe: function (){
            responseHandler.status(404).end()
          }
        };

        var headers = {};

        if (req.body && typeof req.body.pipe == 'function') {
          req.body.pipe({
            write: function(body) {
              bodyStream.push(body);
            },
            end: function(){
              bodyStream.push(null);
            }
          });
        } else {
          bodyStream.push(req.body);
          bodyStream.push(null);
        }

        var statusCode = 200;

        var responseHandler = {
          _removedHeader: {},
          get: function(name){
            return headers[name.toLowerCase()];
          },
          setHeader: function(name, value){
            headers[name.toLowerCase()] = value;
          },
          status: function(status) {
            statusCode = status;
            return this;
          },
          end: function(chunk, encoding){
            var body = chunk;
            if (body instanceof Buffer) {
              body = body.toString(encoding);
            } else if (typeof body == 'object') {
              body = JSON.stringify(body);
              if (!this.get('content-type')) {
                this.setHeader('content-type', 'application/json');
              }
            }

            if (typeof body === 'string' && !this.get('content-type')) {
              this.setHeader('content-type', 'text/plain');
            }

            if (before === 'http') {
              var stream = new ReadableStream();
              stream._read = function noop() {};
              stream.push(body);
              stream.push(null);

              body = stream;
            }
            success({
              statusText: statusCodes[statusCode.toString()],
              statusCode: statusCode,
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

  if (isNode) {
    require('httpism').removeMiddleware('vinehill');
    require('httpism').insertMiddleware(makeMiddleware('http'));
  }
  require('httpism/browser').removeMiddleware('vinehill');
  require('httpism/browser').insertMiddleware(makeMiddleware('send'));
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
  if (arguments.length > 0) {
    this.add(arguments[0], arguments[1]);
  }
  var appDNS = this.appDNS;
  if (Object.keys(appDNS).length === 0) {
    throw new Error('You must add at least one host `vinehill.add("http://localhost:8080", express())`');
  }

  if (!window.location) {
    window.location = {
      origin: '',
      pathname: '/',
    };
  }
  return this
}

VineHill.prototype.setOrigin = function(host) {
  this.defaultOrigin = host;
}

VineHill.prototype.stop = function() {
  this.defaultOrigin = null;
  this.appDNS = {};
}

module.exports = function(config) {
  var serverUrls = Object.keys(config || {}).filter(function(key) {
    return key.indexOf('http') === 0;
  })

  if (!serverUrls.length){
    throw new Error('You must pass a configuration object like:`{"http://localhost:8080": express()}`');
  }

  if(serverUrls.length > 1 && !config.origin) {
    throw new Error("When more than one server is provided you must specify the origin: `{'http://server1': app1, 'http://server2': app2, origin: 'http://server1'}`")
  }

  var vine = new VineHill();
  serverUrls.forEach(function(url){
    vine.add(url, config[url]);
  });

  vine.start();

  return vine;
};
