var vineHill = require('../');
var expect = require('chai').expect;
var isNode = require('is-node');
var express = require('express');
var bodyParser = require('body-parser');
var httpismServer = require('httpism');
var httpismBrowser = require('httpism/browser');

httpismServer.name = 'httpism'
httpismBrowser.name = 'httpism/browser'

var modulesToTest = [httpismBrowser];

if (isNode) {
  modulesToTest.unshift(httpismServer);
}

modulesToTest.forEach(httpism => {
  describe(`virtual http adapter ${httpism.name}`, () => {
    it('GET plain text response', () => {
      var app = express();
      app.get('/some/file.txt', (req, res) => {
        res.status(200).end('some response');
      });

      vineHill({'http://server1': app});

      return httpism.get('http://server1/some/file.txt').then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.eql('some response');
      });
    });

    it('handles a 500 response', () => {
      var app = express();
      app.get('/some/file.txt', (req, res) => {
        res.status(500).send('INTERNAL ERROR')
      });

      vineHill({'http://server1': app});

      return httpism.get('http://server1/some/file.txt').then(response => {
        throw new Error('should not have been handled')
      }).catch(e => {
        expect(e.message).to.equal('GET http://server1/some/file.txt => 500 Internal Server Error')
      });
    });

    it('handles a 404 when there is no route', () => {
      var app = express();

      vineHill({'http://server1': app});

      return httpism.get('http://server1/some/file.txt').then(response => {
        throw new Error('should not have been handled')
      }).catch(e => {
        expect(e.message).to.equal('GET http://server1/some/file.txt => 404 Not Found')
      });
    });

    context('origin', () => {
      it('requests are made from the origin', () => {
        var app = express();
        app.use('/some/file.txt', (req, res) => {
          res.end('some response');
        });

        vineHill({'http://server1': app});

        return httpism.get('/some/file.txt').then(response => {
          expect(response.body).to.eql('some response');
        });
      });

      it('errors when no default origin is provided and there are multiple servers', () => {
        try {
          vineHill({
            'http://server1': express(),
            'http://server2': express()
          });
          throw new Error('should not have been handled');
        } catch (e) {
          expect(e.message).to.include("When more than one server is provided you must specify the origin: `{'http://server1': app1, 'http://server2': app2, origin: 'http://server1'}`")
        }
      });

      it('gives a nice error when calling vinehill with no params', () => {
        try {
          vineHill();
          throw new Error('should not have been handled');
        } catch(e) {
          expect(e.message).to.include('You must pass a configuration object like:`{"http://localhost:8080": express()}`');
        }
      });

      it('requests made but no hosts added', () => {
        try {
          vineHill({});
          throw new Error('should not have been handled');
        } catch(e) {
          expect(e.message).to.include('You must pass a configuration object like:`{"http://localhost:8080": express()}`');
        }
      });
    });

    it('request from server that does not exist', () => {
      vineHill({'http://server1': express()});

      try {
        httpism.get('http://server2/some/file.txt');
      }
      catch (e) {
        expect(e.message).to.include('No app exists');
      }
    });

    it('sends headers to the server', () => {
      var app = express();
      app.get('/some/file.json', (req, res) => {
        res.json(req.headers);
      });

      vineHill({'http://server1': app});

      return httpism.get('http://server1/some/file.json',{
        headers: {user: 'blob'}
      }).then(response => {
        expect(response.body).to.include({
          user: 'blob'
        });
      });
    });

    context('multiple servers', () => {
      it('GET plain text response', () => {
        var app1 = express();
        app1.use('/some/file.txt', (req, res) => {
          res.end('app1');
        });

        var app2 = express();
        app2.use('/some/file.txt', (req, res) => {
          res.end('app2');
        });

        vineHill({
          'http://server1': app1,
          'http://server2': app2,
          origin: 'http://server1'
        })

        return httpism.get('http://server1/some/file.txt').then(response => {
          expect(response.body).to.eql('app1');
        }).then(() => {
          return httpism.get('http://server2/some/file.txt').then(response => {
            expect(response.body).to.eql('app2');
          });
        });
      });
    });

    it('GET json response', () => {
      var app = express();
      app.use('/some/file.json', (req, res) => {
        res.end({
          ok: true
        });
      });

      vineHill({'http://server1': app});

      return httpism.get('http://server1/some/file.json').then(response => {
        expect(response.body).to.eql({
          ok: true
        });
      });
    });

    it('POST text', () => {
      var app = express();
      app.post('/file', (req, res) => {
        res.send(req.headers);
      });

      vineHill({'http://server1': app});

      return httpism.post('http://server1/file', 'hello').then(response => {
        expect(response.body['content-length']).to.eql(5);
      })
    });

    it('POST json body', () => {
      var app = express();
      app.use(bodyParser.json());
      app.post('/some/file.json', (req, res) => {
        res.json(req.body);
      });

      vineHill({'http://server1': app});

      return httpism.post('http://server1/some/file.json', {hello: 'world'}).then(response => {
        expect(response.body).to.eql({
          hello: 'world'
        });
      });
    });
  });

  var helmet = require('helmet');

  describe('express middleware compatibility', () => {
    function setupWithMiddleware(addMiddlewareFn) {
      var app = express();

      addMiddlewareFn(app);

      app.use('/some/stuff', (req, res) => {
        res.end({
          ok: true
        });
      });

      vineHill({'http://server1': app});
    }

    it('works with helmet (hsts in particular)', () => {
      setupWithMiddleware(function(app) {
        app.use(helmet());
      })

      return httpism.get('http://server1/some/stuff').then(response => {
        expect(response.body).to.eql({
          ok: true
        });
      });
    })
  })
});
