var VineHill = require('../');
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
    var vine;
    beforeEach(() => {
      vine = new VineHill();
    });

    afterEach(() => vine.stop());

    it('GET plain text response', () => {
      var app = express();
      app.get('/some/file.txt', (req, res) => {
        res.end('some response');
      });

      vine.start('http://server1', app);

      return httpism.get('http://server1/some/file.txt').then(response => {
        expect(response.body).to.eql('some response');
      });
    });

    context('origin', () => {
      it('requests are made from the origin', () => {
        var app = express();
        app.use('/some/file.txt', (req, res) => {
          res.end('some response');
        });

        vine.start('http://server1', app);

        return httpism.get('/some/file.txt').then(response => {
          expect(response.body).to.eql('some response');
        });
      });

      it('requests made but no hosts added', () => {
        try {
          vine.start();
          new Error('should not have been handled');
        } catch(e) {
          expect(e.message).to.include('You must add at least one host `vinehill.add("http://localhost:8080", express())`');
        }
      });
    });

    it('request from server that does not exist', () => {
      vine.start('http://server1', express());

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

      vine.start('http://server1', app);

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

        vine.add('http://server1', app1);
        vine.add('http://server2', app2);
        vine.start();

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

      vine.start('http://server1', app);

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

      vine.start('http://server1', app);

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

      vine.start('http://server1', app);

      return httpism.post('http://server1/some/file.json', {hello: 'world'}).then(response => {
        expect(response.body).to.eql({
          hello: 'world'
        });
      });
    });
  });
});
