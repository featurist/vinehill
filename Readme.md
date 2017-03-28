# Vine Hill
A Virtual Http adapter to allow in process xhr

# Why?
Full stack testing of server and client code allows you to describe at a high level what an application does. Actually starting and running servers along with dispatching requests is slow and prone to errors.

Vine Hill allows you to "start" a server virutally and connect it with your client code by installing a bridge between XmlHttpRequest and your server. This allows the server to respond to requests in the same process as your client code and tests are running.

What you get is high performance tests with easy to ready stacktraces and great debugability.

# Get started

```js
var express = require('express');
var app = express();

app.get('/weather/:city', (req, res) => {
  res.json({
    city: req.params.city,
    temp: '22C'
  });
});


// connect your app to a host name
var vineHill = require('vinehill');

// for a single server
vineHill({'http://weather.com': app});

// or for multiple servers
// vineHill({
//   'http://weather.com': app,
//   'http://other.com': otherApp
// })


var httpism = require('httpism/browser');
httpism.get('http://weather.com/weather/london').then(response => {
  console.log(response.body.temp);
});
```

# Logging

Vinehill logs requests/responses using the excellent [debug](https://www.npmjs.com/package/debug) module
To log in the console set the `DEBUG` env variable to `vinehill*` and then run your tests.

For example:

```
DEBUG=vinehill* mocha
```

If you are using vinehill in a browser then you can enable logging by running this code in the console (or before vinehill is required)

```js
localStorage.debug = 'vinehill*'
```
You can further filter logging by replacing `vinehill*`:
 - `vinehill` only logs a simplified `METHOD: URL STATUS => STATUSTEXT` eg. `PUT: http://server1/some/file.txt => 200 OK`
- `vinehill:request` only log request objects
- `vinehill:response` only log response objects
- `vinehill*` log request, response and simplified version

# Browser support

* Chrome
* Firefox
* IE 11
* IE Edge

## Unsupported Browsers

Safari:
  SyntaxError: Cannot declare a parameter named 'error' as it shadows the name of a strict mode function.
  at /tmp/derek/node_modules/send/index.js:272:0

IE10:
  Object doesn't support property or method 'use'
  at /tmp/derek/node_modules/express/lib/application.js:143:0
