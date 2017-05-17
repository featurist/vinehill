var urlUtils = require('url')
module.exports = {}

function middleware (name, fn) {
  module.exports[name] = fn
  fn.middleware = name
}

middleware('redirect', function (request, next, api) {
  return next().then(function (response) {
    var statusCode = response.statusCode
    var location = response.headers.location

    if (request.options.redirect !== false && location && (statusCode === 300 || statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307)) {
      return api.get(urlUtils.resolve(request.url, location), request.options).then(function (redirectResponse) {
        var error = new Error()
        error.redirectResponse = redirectResponse
        throw error
      })
    } else {
      return response
    }
  })
})

var cookieStore = {}
middleware('cookies', function (request, next, api) {
  var url = require('url').parse(request.url)
  var cookies = request.options.cookies = api._options.cookies = cookieStore
  var cookieUrl = url.protocol + '://' + url.hostname

  if (cookies) {
    if (cookies[cookieUrl]) {
      request.headers.cookie = cookies[cookieUrl]
    }
    return next().then(function (response) {
      if (response.headers['set-cookie']) {
        cookies[cookieUrl] = response.headers['set-cookie'].join(',')
      }
      return response
    })
  } else {
    return next()
  }
})
