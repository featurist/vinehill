var expect = require('chai').expect;
var connect = require('connect');
var express = require('express');
var httpism = require('httpism/browser');
var VineHill = require('../');

describe('virtual http adapter', () => {
  var vine;
  beforeEach(() => {
    vine = new VineHill();
  });

  afterEach(() => vine.stop());

  it('GET plain text response', () => {
    var app = connect();
    app.use('/some/file.txt', (req, res) => {
      res.end('some response');
    });

    vine.add('http://server1', app);
    vine.start();

    return httpism.get('http://server1/some/file.txt').then(response => {
      expect(response.body).to.eql('some response');
    });
  });

  context('origin', () => {
    it('requests are made from the origin', () => {
      var app = connect();
      app.use('/some/file.txt', (req, res) => {
        res.end('some response');
      });

      vine.add('http://server1', app);
      vine.start();

      return httpism.get('/some/file.txt').then(response => {
        expect(response.body).to.eql('some response');
      });
    });

    it('requests made but no hosts added', () => {
      vine.start();

      return new Promise(function(passed, failed) {
        return httpism.get('/some/file.txt').then(() => {
          failed(new Error('should not have been handled'));
        }).catch(e => {
          expect(e.message).to.include('You must add at least one host `vinehill.add("http://localhost:8080", connect())`');
          passed();
        })
      });
    });
  });

  it('request from server that does not exist', () => {
    vine.add('http://server1', connect());
    vine.start();

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
    var app = connect();
    app.use('/some/file.json', (req, res) => {
      res.end({
        ok: true
      });
    });

    vine.add('http://server1', app);
    vine.start();

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

      vine.add('http://server1', app);
      vine.start();

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

    vine.add('http://server1', app);
    vine.start();

    return httpism.post('http://server1/some/file.json', {hello: 'world'}).then(response => {
      expect(response.body).to.eql({
        hello: 'world'
      });
    });
  });
});
