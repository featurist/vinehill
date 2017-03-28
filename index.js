var window = require('global');
var isNode = require('is-node');
var statusCodes = require('builtin-status-codes/browser')
var urlUtils = require('url');
var Stream = require('stream');
var log = require('./log')

if (!isNode) {
  var http = require('http');
  http.IncomingMessage = {prototype: Stream.Readable.prototype}
  http.ServerResponse = {};
  http.Server = function() {}
  global.setImmediate = function(cb) {
    var args = Array.prototype.slice.call(arguments, 1)
    setTimeout(function(){
      cb.apply(this, args)
    })
  }
  process.version = '7.5.0';
}

function VineHill() {
  var self = this;
  this.appDNS = {};

  function makeMiddleware(before) {
    var vinehillMiddleware = function(req){
      if (!req.url) {
        throw new Error('The request object must supply a url')
      }
      var origin = self.getOrigin(req.url);
      var reqUrl = urlUtils.parse(req.url);
      var requestApp = self.appDNS[origin];
      if (!requestApp) {
        throw new Error('No app exists to listen to requests for '+origin);
      }

      if (before === 'send' && req.body && typeof req.body == 'string') {
        req.headers['content-length'] = req.body.length;
      }

      return new Promise(function(success){
        log.request(req)
        var request = new Stream.Readable();

        request.url = reqUrl.path
        request.hostname = reqUrl.hostname
        request.method = req.method
        request.headers = req.headers
        request.socket = {
          destroy: function() {}
        }
        request.connection = {}
        request.unpipe = function (){
          response.status(404).end()
        }
        request._read = function () {
          if (req.body && typeof req.body.pipe == 'function') {
            req.body.pipe({
              write: function(body) {
                request.push(body);
              },
              end: function(){
                request.push(null);
              }
            });
          } else {
            request.push(req.body);
            request.push(null);
          }
        }


        var response = new Stream.Writable({
          objectMode: true,
          decodeStings: false,
        });

        var headers = {};
        response.headers = headers;
        response._removedHeader = {};
        response.statusCode = 200;
        response.get = function(name){
          return headers[name.toLowerCase()];
        }
        response.removeHeader = function(name) {
          delete [name.toLowerCase()];
        }
        response.getHeader = function(name) {
          return headers[name.toLowerCase()];
        }
        response.setHeader = function(name, value){
          headers[name.toLowerCase()] = value;
        }
        response.status = function(status) {
          this.statusCode = status;
          return this;
        }
        response.writeHead = function noop() {}

        if (before === 'http') {
          var resBodyStream = new Stream.Readable();
          resBodyStream._read = function noop() {};

          response.write = function(chunk, encoding) {
            if (chunk instanceof Buffer) {
              chunk = chunk.toString(encoding);
            } else if (typeof chunk == 'object') {
              chunk = JSON.stringify(chunk);
              if (!this.get('content-type')) {
                this.setHeader('content-type', 'application/json');
              }
            }

            if (typeof chunk === 'string' && !this.get('content-type')) {
              this.setHeader('content-type', 'text/plain');
            }

            if (!this.headWritten) {
              this.headWritten = true;
              this.writeHead(this.statusCode, headers);
            }
            resBodyStream.push(chunk);
            return true;
          }

          response.end = function(chunk, encoding) {
            this.write(chunk, encoding)
            resBodyStream.push(null)

            success({
              statusText: statusCodes[this.statusCode.toString()],
              statusCode: this.statusCode,
              headers: headers,
              body: resBodyStream,
              url: req.url
            });
          }
        }
        else {
          var body = []
          response.write = function(chunk, encoding) {
            if (chunk instanceof Buffer) {
              chunk = chunk.toString(encoding);
            } else if (typeof chunk == 'object') {
              chunk = JSON.stringify(chunk);
              if (!this.get('content-type')) {
                this.setHeader('content-type', 'application/json');
              }
            }

            if (typeof chunk === 'string' && !this.get('content-type')) {
              this.setHeader('content-type', 'text/plain');
            }

            if (!this.headWritten) {
              this.headWritten = true;
              this.writeHead(this.statusCode, headers);
            }
            body.push(chunk);
            return true;
          }

          response.end = function(chunk, encoding) {
            this.write(chunk, encoding)

            success({
              statusText: statusCodes[this.statusCode.toString()],
              statusCode: this.statusCode,
              headers: headers,
              body: body.join(''),
              url: req.url
            });
          }
        }
        requestApp.handle(request, response);
      }).then(res => {
        log.main(req.method.toUpperCase() + ': ' + req.url + ' => ' + res.statusCode + ' ' + res.statusText)
        log.response(res)
        return res
      })
    };

    vinehillMiddleware.before = [before];
    vinehillMiddleware.middleware = 'vinehill';
    return vinehillMiddleware;
  }

  if (isNode) {
    require('httpism').removeMiddleware('vinehill');
    require('httpism').insertMiddleware(makeMiddleware('http'));
  }

  var middleware = require('httpism/middleware');
  var httpismBrowser = require('httpism/browser')
  httpismBrowser.removeMiddleware('vinehill');
  httpismBrowser.insertMiddleware(makeMiddleware('send'));

  httpismBrowser.removeMiddleware('cookies');
  httpismBrowser.removeMiddleware('redirect');

  browserMiddleware.cookies.before = 'vinehill';
  browserMiddleware.cookies.name = 'cookies';
  httpismBrowser.insertMiddleware(browserMiddleware.cookies);

  browserMiddleware.redirect.before = 'cookies';
  httpismBrowser.insertMiddleware(browserMiddleware.redirect)
}
var browserMiddleware = {};

function middleware(name, fn) {
  browserMiddleware[name] = fn;
  fn.middleware = name;
}

middleware('redirect', function(request, next, api) {
  return next().then(function(response) {
    var statusCode = response.statusCode;
    var location = response.headers.location;

    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
      return api.get(urlUtils.resolve(request.url, location), request.options).then(function(redirectResponse) {
        throw {
          redirectResponse: redirectResponse
        };
      });
    } else {
      return response;
    }
  });
});

var cookieStore = {}
middleware('cookies', function (request, next, api) {
  var url = require('url').parse(request.url)
  var cookies = request.options.cookies = api._options.cookies = cookieStore;
  var cookieUrl = url.protocol + '://'+url.hostname

  if (cookies) {
    if (cookies[cookieUrl]) {
      request.headers.cookie = cookies[cookieUrl]
    }
    return next().then(function (response) {
      if (response.headers['set-cookie']) {
        cookies[cookieUrl] = response.headers['set-cookie'].join(',')
      }
      return response;
    });
  } else {
    return next();
  }
});

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
