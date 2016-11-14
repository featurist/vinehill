var expect = require('chai').expect;
var connect = require('connect');
var express = require('express');
var httpism = require('httpism/browser');
var vinehill = require('../');

describe('virtual http adapter', () => {
  beforeEach(vinehill.reset);

  it('GET plain text response', () => {
    var app = connect();
    app.use('/some/file.txt', (req, res) => {
      res.end('some response');
    });

    vinehill('http://server1', app);

    return httpism.get('http://server1/some/file.txt').then(response => {
      expect(response.body).to.eql('some response');
    });
  });

  context('origin', () => {
    it('requests are made from the origin', () => {
      var app = connect();
      app.use('/some/file.txt', (req, res) => {
        setTimeout(() => {
          res.end('some response');
        }, 500);
      });

      vinehill.setOrigin('http://server1');
      vinehill('http://server1', app);

      return httpism.get('/some/file.txt').then(response => {
        expect(response.body).to.eql('some response');
      });
    });

    it('requests made with no origin set and that dont specify a host error', () => {
      vinehill('http://server1', connect());

      return new Promise(function(passed, failed) {
        return httpism.get('/some/file.txt').then(() => {
          failed(new Error('should not have been handled'));
        }).catch(e => {
          expect(e.message).to.include('Use `setOrigin` to make requests without a host');
          passed();
        })
      });
    });
  });

  it('request from server that does not exist', () => {
    vinehill('http://server1', connect());

    return new Promise(function(passed, failed) {
      return httpism.get('http://server2/some/file.txt').then(() => {
        failed(new Error('should not have been handled'));
      }).catch(e => {
        expect(e.message).to.include('No app exists');
        passed();
      })
    });
  });

  context('multiple servers', () => {
    it('GET plain text response', () => {
      var app1 = connect();
      app1.use('/some/file.txt', (req, res) => {
        res.end('app1');
      });

      var app2 = connect();
      app2.use('/some/file.txt', (req, res) => {
        res.end('app2');
      });

      vinehill('http://server1', app1);
      vinehill('http://server2', app2);

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
    var app = connect();
    app.use('/some/file.json', (req, res) => {
      res.end({
        ok: true
      });
    });

    vinehill('http://server1', app);

    return httpism.get('http://server1/some/file.json').then(response => {
      expect(response.body).to.eql({
        ok: true
      });
    });
  });

  context('express', () => {
    it('GET json response', () => {
      var app = express();
      app.get('/some/file.json', (req, res) => {
        res.json({
          ok: true
        });
      });

      vinehill('http://server1', app);

      return httpism.get('http://server1/some/file.json').then(response => {
        expect(response.body).to.eql({
          ok: true
        });
      });
    });
  });

  it('POST json body', () => {
    var app = connect();
    app.use('/some/file.json', (req, res) => {
      res.end(JSON.parse(req.body));
    });

    vinehill('http://server1', app);

    return httpism.post('http://server1/some/file.json', {hello: 'world'}).then(response => {
      expect(response.body).to.eql({
        hello: 'world'
      });
    });
  });
});
