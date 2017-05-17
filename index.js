var window = require('global')
var isNode = require('is-node')
var Stream = require('stream')
var browserMiddleware = require('./browserMiddleware')
var makeMiddleware = require('./makeMiddleware')

if (!isNode) {
  var http = require('http')
  http.IncomingMessage = {prototype: Stream.Readable.prototype}
  http.ServerResponse = {}
  http.Server = function () {}
  global.setImmediate = function (cb) {
    var args = Array.prototype.slice.call(arguments, 1)
    setTimeout(function () {
      cb.apply(this, args)
    })
  }
  process.version = '7.5.0'
}

function VineHill () {
  this.appDNS = {}

  if (isNode) {
    require('httpism').remove('vinehill')
    require('httpism').use(makeMiddleware(this, 'http'))
  }

  var httpismBrowser = require('httpism/browser')
  httpismBrowser.remove('vinehill')
  httpismBrowser.use(makeMiddleware(this, 'xhr'))

  httpismBrowser.remove('cookies')
  httpismBrowser.remove('redirect')

  browserMiddleware.cookies.before = 'vinehill'
  browserMiddleware.cookies.name = 'cookies'
  httpismBrowser.use(browserMiddleware.cookies)

  browserMiddleware.redirect.before = 'cookies'
  httpismBrowser.use(browserMiddleware.redirect)
}

VineHill.prototype.add = function (host, app) {
  if (Object.keys(this.appDNS).length === 0) this.setOrigin(host)
  this.appDNS[host] = app
  return this
}

VineHill.prototype.getOrigin = function (url) {
  var origin = url.match(/^(https?:\/\/.*?)\/.*/i)
  if (origin) {
    return origin[1]
  }
  return this.defaultOrigin
}

VineHill.prototype.start = function () {
  if (arguments.length > 0) {
    this.add(arguments[0], arguments[1])
  }
  var appDNS = this.appDNS
  if (Object.keys(appDNS).length === 0) {
    throw new Error('You must add at least one host `vinehill.add("http://localhost:8080", express())`')
  }

  if (!window.location) {
    window.location = {
      origin: '',
      pathname: '/'
    }
  }
  return this
}

VineHill.prototype.setOrigin = function (host) {
  this.defaultOrigin = host
}

VineHill.prototype.stop = function () {
  this.defaultOrigin = null
  this.appDNS = {}
}

module.exports = function (config) {
  var serverUrls = Object.keys(config || {}).filter(function (key) {
    return key.indexOf('http') === 0
  })

  if (!serverUrls.length) {
    throw new Error('You must pass a configuration object like:`{"http://localhost:8080": express()}`')
  }

  if (serverUrls.length > 1 && !config.origin) {
    throw new Error("When more than one server is provided you must specify the origin: `{'http://server1': app1, 'http://server2': app2, origin: 'http://server1'}`")
  }

  var vine = new VineHill()
  serverUrls.forEach(function (url) {
    vine.add(url, config[url])
  })

  vine.start()

  return vine
}
