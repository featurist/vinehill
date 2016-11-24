#Vine Hill
A Virtual Http adapter to allow in process xhr

# Why?
Full stack testing of server and client code allows you to describe at a high level what an application does. Actually starting and running servers along with dispatching requests is slow and prone to errors.

Vine Hill allows you to "start" a server virutally and connect it with your client code by installing a bridge between XmlHttpRequest and your server. This allows the server to respond to requests in the same process as your client code and tests are running.

What you get is high performance tests with easy to ready stacktraces and great debugability.

# Get started

```
var express = require('express');
var app = express();

app.get('/weather/:city', (req, res) => {
  res.json({
    city: req.params.city,
    temp: '22C'
  });
});


// connect your app to a host name
var VineHill = require('vinehill');
var vine = new VineHill();

// for a single server
vine.start('http://weather.com', app);

// or for multiple servers
// vine.add('http://weather.com', app);
// vine.add('http://other.com', otherApp);
// vine.start();


var httpism = require('httpism/browser');
httpism.get('http://weather.com/weather/london').then(response => {
  console.log(response.body.temp);
});
```
