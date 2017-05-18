var statusCodes = require('builtin-status-codes/browser')
var urlUtils = require('url')
var Stream = require('stream')
var log = require('./log')
var TextEncoder = require('text-encoding').TextEncoder

module.exports = function makeMiddleware (vine, type) {
  var vinehillMiddleware = function (req) {
    if (!req.url) {
      throw new Error('The request object must supply a url')
    }
    var origin = vine.getOrigin(req.url)
    var reqUrl = urlUtils.parse(req.url)
    var requestApp = vine.appDNS[origin]
    if (!requestApp) {
      throw new Error('No app exists to listen to requests for ' + origin)
    }

    if (type === 'xhr' && req.body && typeof req.body === 'string') {
      req.headers['content-length'] = (new TextEncoder('utf-8').encode(req.body)).length
    }

    return new Promise(function (resolve) {
      log.request(req)
      var request = new Stream.Readable()

      request.url = reqUrl.path
      request.hostname = reqUrl.hostname
      request.method = req.method
      request.headers = req.headers
      request.socket = {
        destroy: function () {}
      }
      request.connection = {}
      request.unpipe = function () {
        response.status(404).end()
      }
      request._read = function () {
        if (req.body && typeof req.body.pipe === 'function') {
          req.body.pipe({
            write: function (body) {
              request.push(body)
            },
            end: function () {
              request.push(null)
            }
          })
        } else {
          request.push(req.body)
          request.push(null)
        }
      }

      var response = new Stream.Writable({
        objectMode: true,
        decodeStings: false
      })

      var headers = {}
      response.headers = headers
      response._removedHeader = {}
      response.statusCode = 200
      response.get = function (name) {
        return headers[name.toLowerCase()]
      }
      response.removeHeader = function (name) {
        delete [name.toLowerCase()]
      }
      response.getHeader = function (name) {
        return headers[name.toLowerCase()]
      }
      response.setHeader = function (name, value) {
        headers[name.toLowerCase()] = value
      }
      response.status = function (status) {
        this.statusCode = status
        return this
      }
      response.writeHead = function noop () {}

      if (type === 'http') {
        var resBodyStream = new Stream.Readable()
        resBodyStream._read = function noop () {}

        response.write = function (chunk, encoding) {
          if (chunk instanceof Buffer) {
            chunk = chunk.toString(encoding)
          } else if (typeof chunk === 'object') {
            chunk = JSON.stringify(chunk)
            if (!this.get('content-type')) {
              this.setHeader('content-type', 'application/json')
            }
          }

          if (typeof chunk === 'string' && !this.get('content-type')) {
            this.setHeader('content-type', 'text/plain')
          }

          if (!this.headWritten) {
            this.headWritten = true
            this.writeHead(this.statusCode, headers)
          }
          resBodyStream.push(chunk)
          return true
        }

        response.end = function (chunk, encoding) {
          this.write(chunk, encoding)
          resBodyStream.push(null)

          resolve({
            statusText: statusCodes[this.statusCode.toString()],
            statusCode: this.statusCode,
            headers: headers,
            body: resBodyStream,
            url: req.url
          })
        }
      } else {
        var body = []
        response.write = function (chunk, encoding) {
          if (chunk instanceof Buffer) {
            chunk = chunk.toString(encoding)
          } else if (typeof chunk === 'object') {
            chunk = JSON.stringify(chunk)
            if (!this.get('content-type')) {
              this.setHeader('content-type', 'application/json')
            }
          }

          if (typeof chunk === 'string' && !this.get('content-type')) {
            this.setHeader('content-type', 'text/plain')
          }

          if (!this.headWritten) {
            this.headWritten = true
            this.writeHead(this.statusCode, headers)
          }
          body.push(chunk)
          return true
        }

        response.end = function (chunk, encoding) {
          this.write(chunk, encoding)

          resolve({
            statusText: statusCodes[this.statusCode.toString()],
            statusCode: this.statusCode,
            headers: headers,
            body: body.join(''),
            url: req.url
          })
        }
      }
      requestApp.handle(request, response)
    }).then(function (res) {
      log.main(req.method.toUpperCase() + ': ' + req.url + ' => ' + res.statusCode + ' ' + res.statusText)
      log.response(res)
      return res
    })
  }

  vinehillMiddleware.httpismMiddleware = {
    name: 'vinehill',
    before: [type]
  }
  return vinehillMiddleware
}
