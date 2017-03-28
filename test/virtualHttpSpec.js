var vineHill = require('../')
var chai = require('chai')
var chaiSubset = require('chai-subset')
chai.use(chaiSubset)
var expect = chai.expect
var isNode = require('is-node')
var express = require('express')
var httpismServer = require('httpism')
var httpismBrowser = require('httpism/browser')

var helmet = require('helmet')
var setSession = require('express-session')
var bodyParser = require('body-parser')
var logger = require('./fakeLogger')

httpismServer.name = 'httpism'
httpismBrowser.name = 'httpism/browser'

var modulesToTest = [httpismBrowser]

if (isNode) {
  modulesToTest.unshift(httpismServer)
}

modulesToTest.forEach(httpism => {
  describe(`virtual http adapter ${httpism.name}`, () => {
    it('missing url throws exception', () => {
      var app = express()
      app.get('/some/file.txt', (req, res) => {
        res.status(200).end('some response')
      })

      vineHill({'http://server1': app})

      return expect(() => httpism.get(undefined)).to.throw('The request object must supply a url')
    })

    it('GET plain text response', () => {
      var app = express()
      app.get('/some/file.txt', (req, res) => {
        res.status(200).end('some response')
      })

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.txt').then(response => {
        expect(response.statusCode).to.equal(200)
        expect(response.body).to.eql('some response')
      })
    })
    it('can write to the body multiple times', () => {
      var app = express()
      app.get('/some/file.txt', (req, res) => {
        res.write('one')
        res.write('two')
        res.end()
      })

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.txt').then(response => {
        expect(response.body).to.eql('onetwo')
      })
    })

    it('handles a 500 response', () => {
      var app = express()
      app.get('/some/file.txt', (req, res) => {
        res.status(500).send('INTERNAL ERROR')
      })

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.txt').then(response => {
        throw new Error('should not have been handled')
      }).catch(e => {
        expect(e.message).to.equal('GET http://server1/some/file.txt => 500 Internal Server Error')
      })
    })

    it('handles a 404 when there is no route', () => {
      var app = express()

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.txt').then(response => {
        throw new Error('should not have been handled')
      }).catch(e => {
        expect(e.message).to.equal('GET http://server1/some/file.txt => 404 Not Found')
      })
    })

    context('origin', () => {
      it('requests are made from the origin', () => {
        var app = express()
        app.use('/some/file.txt', (req, res) => {
          res.end('some response')
        })

        vineHill({'http://server1': app})

        return httpism.get('/some/file.txt').then(response => {
          expect(response.body).to.eql('some response')
        })
      })

      it('errors when no default origin is provided and there are multiple servers', () => {
        try {
          vineHill({
            'http://server1': express(),
            'http://server2': express()
          })
          throw new Error('should not have been handled')
        } catch (e) {
          expect(e.message).to.include("When more than one server is provided you must specify the origin: `{'http://server1': app1, 'http://server2': app2, origin: 'http://server1'}`")
        }
      })

      it('gives a nice error when calling vinehill with no params', () => {
        try {
          vineHill()
          throw new Error('should not have been handled')
        } catch (e) {
          expect(e.message).to.include('You must pass a configuration object like:`{"http://localhost:8080": express()}`')
        }
      })

      it('requests made but no hosts added', () => {
        try {
          vineHill({})
          throw new Error('should not have been handled')
        } catch (e) {
          expect(e.message).to.include('You must pass a configuration object like:`{"http://localhost:8080": express()}`')
        }
      })
    })

    it('request from server that does not exist', () => {
      vineHill({'http://server1': express()})

      try {
        httpism.get('http://server2/some/file.txt')
      } catch (e) {
        expect(e.message).to.include('No app exists')
      }
    })

    it('sends headers to the server', () => {
      var app = express()
      app.get('/some/file.json', (req, res) => {
        res.json(req.headers)
      })

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.json', {
        headers: {user: 'blob'}
      }).then(response => {
        expect(response.body).to.include({
          user: 'blob'
        })
      })
    })

    context('multiple servers', () => {
      it('GET plain text response', () => {
        var app1 = express()
        app1.use('/some/file.txt', (req, res) => {
          res.end('app1')
        })

        var app2 = express()
        app2.use('/some/file.txt', (req, res) => {
          res.end('app2')
        })

        vineHill({
          'http://server1': app1,
          'http://server2': app2,
          origin: 'http://server1'
        })

        return httpism.get('http://server1/some/file.txt').then(response => {
          expect(response.body).to.eql('app1')
        }).then(() => {
          return httpism.get('http://server2/some/file.txt').then(response => {
            expect(response.body).to.eql('app2')
          })
        })
      })
    })

    it('GET json response', () => {
      var app = express()
      app.use('/some/file.json', (req, res) => {
        res.end({
          ok: true
        })
      })

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.json').then(response => {
        expect(response.body).to.eql({
          ok: true
        })
      })
    })

    it('POST text', () => {
      var app = express()
      app.post('/file', (req, res) => {
        res.send(req.headers)
      })

      vineHill({'http://server1': app})

      return httpism.post('http://server1/file', 'hello').then(response => {
        expect(response.body['content-length']).to.eql(5)
      })
    })

    it('POST json body', () => {
      var app = express()
      app.use(bodyParser.json())
      app.post('/some/file.json', (req, res) => {
        res.json(req.body)
      })

      vineHill({'http://server1': app})

      return httpism.post('http://server1/some/file.json', {hello: 'world'}).then(response => {
        expect(response.body).to.eql({
          hello: 'world'
        })
      })
    })
  })

  it('can redirect', () => {
    var app = express()
    app.get('/some/file.json', (req, res) => {
      res.redirect('/some/other.json')
    })

    app.get('/some/other.json', (req, res) => {
      res.send('OK')
    })

    vineHill({'http://server1': app})

    return httpism.get('/some/file.json').then(response => {
      expect(response.statusCode).to.equal(200)
      expect(response.url).to.equal('/some/other.json')
    })
  })

  describe('express middleware compatibility', () => {
    function setupWithMiddleware (addMiddlewareFn) {
      var app = express()

      addMiddlewareFn(app)

      vineHill({'http://server1': app})
    }

    it('works with helmet (hsts in particular)', () => {
      setupWithMiddleware(function (app) {
        app.use(helmet())
        app.get('/some/stuff', (req, res) => {
          res.end({
            ok: true
          })
        })
      })

      return httpism.get('http://server1/some/stuff').then(response => {
        expect(response.body).to.eql({
          ok: true
        })
      })
    })

    it('works with sessions', () => {
      var session = {
        secret: 'webSessionSecret',
        cookie: {
          path: '/',
          secure: false
        }
      }
      setupWithMiddleware(function (app) {
        app.use(setSession(session))
        app.get('/set-session', (req, res) => {
          req.session.message = 'hello'
          res.send('OK')
        })

        app.get('/get-session', (req, res) => {
          res.send(req.session.message)
        })
      })

      var api = httpism.api('http://server1/', {cookies: true})
      return api.get('/set-session').then(setResponse => {
        expect(setResponse.body).to.equal('OK')
        return api.get('/get-session').then(getResponse => {
          expect(getResponse.body).to.equal('hello')
        })
      })
    })
  })

  describe('logging', () => {
    beforeEach(() => {
      logger.start()
    })

    afterEach(() => {
      logger.stop()
    })

    it('logs the request and response', () => {
      var app = express()
      app.put('/some/file.txt', (req, res) => {
        res.status(200).end('some response')
      })

      vineHill({'http://server1': app})

      var putBody = {a: 1}

      return httpism.put('http://server1/some/file.txt', putBody).then(() => {
        expect(logger.main).to.contain('PUT: http://server1/some/file.txt => 200 OK')

        var request = logger.requests[0]
        expect(request).to.containSubset({
          method: 'put',
          url: 'http://server1/some/file.txt',
          headers: {
            accept: 'application/json',
            'content-length': 7,
            'content-type': 'application/json'
          }
        })

        var assertions = {
          'httpism': function () {
            expect(typeof request.body.pipe).to.equal('function')
            expect(request.stringBody).to.equal(JSON.stringify(putBody))
          },
          'httpism/browser': function () {
            expect(request.body).to.equal(JSON.stringify(putBody))
          }
        }

        assertions[httpism.name]()

        var response = logger.responses[0]
        expect(response).to.contain({
          url: 'http://server1/some/file.txt',
          body: 'some response',
          statusCode: 200,
          statusText: 'OK'
        })
      })
    })

    it('logs a server error', () => {
      var app = express()
      app.get('/some/file.txt', (req, res) => {
        res.status(500).send('INTERNAL ERROR')
      })

      vineHill({'http://server1': app})

      return httpism.get('http://server1/some/file.txt').then(response => {
        throw new Error('should not have been handled')
      }).catch(e => {
        expect(logger.main).to.contain('GET: http://server1/some/file.txt => 500 Internal Server Error')
      })
    })
  })
})
