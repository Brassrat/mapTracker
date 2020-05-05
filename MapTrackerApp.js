#! /usr/bin/env node
var defaultMapHeight = 800;
var defaultMapWidth = 1000;
var LOG_ERROR = 1;
var LOG_WARN = 2;
var LOG_INFO = 3;
var LOG_DEBUG = 4;
var LOG_TRACE = 5;
var logLevel = LOG_ERROR;
var telnetHost = 'localhost';
var telnetPort = 5554;
var mockLocationServiceHost = null;
var mockLocationServicePort = 0;

const stdio = require('stdio');
const ops = stdio.getopt({
  'map': { key: 'm', args: 2, description: 'width and height of map (1000x800)', default: [0, 0] },
  'telnetHost': { key: 't', args: 1, description: 'host emulator is running on', default: '' },
  'telnetPort': { key: 'p', args: 1, description: 'port emulator is reading geo commands', default: '' },
  'trace': { key: 'X', description: 'enable trace level logging', default: false },
  'debug': { key: 'd', description: 'enable debug level logging', default: false },
  'warn': { key: 'w', description: 'enable warning level logging', default: false },
  'info': { key: 'i', description: 'enable info level logging', default: false },
});

if (ops.help) {
  ops.printHelp();
  process.exit(0);
}
if (ops.warn) {
  logLevel = LOG_WARN;
}
if (ops.info) {
  logLevel = LOG_INFO;
}
if (ops.debug) {
  logLevel = LOG_DEBUG;
}
if (ops.trace) {
  logLevel = LOG_TRACE;
}
if (ops.map) {
  defaultMapWidth = parseInt(ops.map[0]) || 1000;
  defaultMapHeight = parseInt(ops.map[1]) || 800;
}
if (ops.telnetHost) {
  telnetHost = ops.telnetHost;
}

if (ops.telnetPort) {
  telnetPort = ops.telnetPort;
}

const express = require('express');
const geohash = require('geohash').GeoHash;

const net = require('net');
const http = require('http');

const fs = require('fs');
const path = require('path');

const app = express();

app.use('/js', express.static(__dirname + '/js'));
/*
   app.get("/js/:file", function(req,res)
   {
   var file = req.params["file"];
   console.log("returning: " + file);
   res.sendfile('./js/' + file);
   });
   */

const showMap = function (req, res, options) {
  let { lat, lng, zoom, mapWidth, mapHeight } = options;
  if (lat === undefined) { lat = 0; }
  //if (lat == 0) { lat =42.402037710905496 ; }
  if (lat === 0) { lat = 42.4021; }
  if (logLevel >= LOG_INFO) { console.log('lat : ' + lat); }
  if (lng === undefined) { lng = 0; }
  //if (lng == 0) { lng =-71.23397827148438; }
  if (lng === 0) { lng = -71.23411; }
  if (logLevel >= LOG_INFO) { console.log('lng : ' + lng); }
  if (zoom === undefined) { zoom = 0; }
  if (zoom === 0) { zoom = 12; }
  if (logLevel >= LOG_INFO) { console.log('zoom : ' + zoom); }
  if (mapWidth === undefined) { mapWidth = 0; }
  if (mapWidth === 0) { mapWidth = defaultMapWidth; }
  if (logLevel >= LOG_INFO) { console.log('mapWidth : ' + mapWidth); }
  if (mapHeight === undefined) { mapHeight = 0; }
  if (mapHeight === 0) { mapHeight = defaultMapHeight; }
  if (logLevel >= LOG_INFO) { console.log('mapHeight : ' + mapHeight); }
  // now we use the templating capabilities of express and call our template
  // to render the view, and pass a few parameters to it
  render(req, res, { lat, lng, zoom, mapWidth, mapHeight });
};

const showFromUrl = function (req, res) {
  if (logLevel >= LOG_INFO) { console.log('using url params ...'); }
  const lat = req.query.lat;
  const lng = req.query.lng;
  const zoom = req.query.zoom;
  const mapWidth = req.query.width;
  const mapHeight = req.query.height;
  showMap(req, res, { lat: lat, lng: lng, zoom: zoom, mapWidth: mapWidth, mapHeight: mapHeight });
};

function render (req, res, info) {
  // now we use the templating capabilities of express and call our template
  // to render the view, and pass a few parameters to it
  let { lat, lng, zoom, mapWidth, mapHeight } = info;
  let listHeight = mapHeight / 2;
  if (listHeight < 200) { listHeight = 200; }
  let ww = (mapWidth - 20);
  if (ww < 300) { ww = 300; }
  ww = 300;
  let listStyle = 'width:' + ww + 'px;height:' + listHeight + 'px;overflow:auto;';
  if (logLevel >= LOG_DEBUG) { console.log('rendering...'); }

  let keyPath=path.join(process.env['HOME'], '.ssh', 'ttt.json');
  let key = require(keyPath).key;
  res.render('index.ejs', { layout: false, key, lat, lng, zoom, mapWidth, mapHeight, listStyle });
}

// route routing is very easy with express, this will handle the request for
// geo :id is used here to pattern match with the first value after the
// forward slash.
app.get('/geo/:id', function (req, res) {
  var zzz = req.params.id;
  if (logLevel >= LOG_DEBUG) { console.log('decoding geohash: ' + zzz); }
  //decode the geohash with geohash module
  var latlng = geohash.decodeGeoHash(zzz);
  if (logLevel >= LOG_INFO) { console.log('latlng : ' + latlng); }
  var lat = latlng.latitude[2];
  if (logLevel >= LOG_DEBUG) { console.log('lat : ' + lat); }
  var lng = latlng.longitude[2];
  if (logLevel >= LOG_DEBUG) { console.log('lng : ' + lng); }
  var zoom = zzz.length + 2;
  if (logLevel >= LOG_DEBUG) { console.log('zoom : ' + zoom); }
  var mapWidth = req.query.mapWidth;
  var mapHeight = req.query.mapHeight;
  showMap(req, res, { lat: lat, lng: lng, zoom: zoom });
});

app.get('/latlng', function (req, res) {
  showFromUrl(req, res);
});

function returnFile (req, res, filePath) {
  if (logLevel >= LOG_DEBUG) { console.log('REQUESTED FILE: ' + filePath); }

  fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
    if (!err) {
      if (logLevel >= LOG_DEBUG) { console.log('received data: ' + data); }
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.write(data);
      res.end();
    }
    else {
      console.log(err);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.write('Unknown file: ' + req.params.file);
      res.end();
    }

  });
}

app.get('/gpx/:file', function (req, res) {
  var filePath = path.join(__dirname, 'gpx', req.params.file.replace(/\.gpx$/, '')) + '.gpx';
  returnFile(req, res, filePath);
});

app.get('/kml/:file', function (req, res) {
  var filePath = path.join(__dirname, 'kml', req.params.file.replace(/\.kml$/, '')) + '.kml';
  returnFile(req, res, filePath);
});

app.get('/favicon.ico', (req, res) => {
  var filePath = path.join(__dirname, 'views', 'favicon.ico');
  returnFile(req, res, filePath);
});

var emulatorSocket = null;
if (logLevel >= LOG_INFO) { console.log('Attempting to connect to emulator at ' + telnetHost + ':' + telnetPort); }
var emulator = net.createConnection(telnetPort, telnetHost);

emulator.on('error', function (e) {
  console.log('Unable to connect to emulator at ' + telnetHost + ':' + telnetPort);
});
emulator.on('connection', function (socket) {
  if (logLevel >= LOG_INFO) { console.log('connection to emulator established'); }
  socket.on('data', function (c) {
    var data = c + '';
    switch (data) {
      case 'OK': // ok we are in
        if (logLevel >= LOG_INFO) { console.log('connect to emulator'); }
        emulatorSocket = socket;
        break;
      default:
        if (logLevel >= LOG_INFO) { console.log('From Emulator: ' + data); }
        break;
    }
  });
});

//var sys = require('sys');
const exec = require('child_process').exec;
const server = http.createServer(app).listen(9090);
const io = require('socket.io')(server);
//io.set('log level', logLevel); // info
const pts = {};
let geofix = false;

exec ('type -p geofix', (error, stdout, stderr) => {
  if (!error) {
    geofix = true;
  }
})

function sendGeo (key) {
  if (logLevel >= LOG_INFO) { console.log('sendGeo ' + key); }
  if (emulatorSocket == null) {
    if (geofix) {
      var cmd = 'geofix ' + telnetHost + ' ' + telnetPort + ' ' + key;
      if (logLevel >= LOG_INFO) { console.log('exec: ' + cmd); }
      exec(cmd, function (error, stdout, stderr) {
        if (logLevel >= LOG_INFO) { console.log('stdout: ' + stdout); }
        if (stderr !== '') { console.log('stderr: ' + stderr); }
        if (error != null) {
          console.log('Exec ' + cmd + ': ' + error.message);
          console.log('stdout: ' + stdout);
        }
      });
    }
  }
  else {
    var msg = 'geo fix ' + key;
    if (logLevel >= LOG_INFO) { console.log('write: ' + msg); }
    emulatorSocket.write(msg);
  }
}

io.sockets.on('connection', function (socket) {
  socket.send('Connection to server established');
  if (logLevel >= LOG_INFO) { console.log('socket.io Connection with client established'); }

  socket.on('message', msg => {
    console.log('received: ${msg}')
  });

  socket.on('point', data => {
    console.log(`received point ${JSON.stringify(data)}`);
    if (data.lng && data.lat) {
      var key = data.lng + ' ' + data.lat;
      if (data.delete) {
        delete pts[key];
      }
      else {
        pts[key] = key;
        sendGeo(key);
      }
    }
    else {
      if (data.replay) {
      }
    }

    socket.send('Server Received point');
  });

  socket.on('route', route => {
    let name = route.name || 'mapData';
    let filePath = path.join(__dirname, 'mapData', 'json', name + '.json');
    console.log(`save route data to ${filePath}`);
    let data = JSON.stringify(route.data, null, 2)
    fs.writeFile(filePath, data,  (err) => {
      if (!err) {
        socket.send(`saved ${filePath}`);
      }
      else {
        socket.send(`not saved: ${err}`);
      }
    });
  });
});

