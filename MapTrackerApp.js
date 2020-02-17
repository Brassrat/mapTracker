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

var stdio = require('stdio');
var ops = stdio.getopt({
  'map': {key: 'm', args: 2, required: false, description: 'width and height of map (1000x800)', default: [0,0]},
    'telnetHost': {key: 't', required: false, args: 1, description: 'host emulator is running on', default: ''},
    'telnetPort': {key: 'p', required: false, args: 1, description: 'port emulator is reading geo commands', default: ''},
    'trace': {key: 'X', required: false, description: 'enable trace level logging', default: false},
    'debug': {key: 'd', required: false, description: 'enable debug level logging', default: false},
    'warn': {key: 'w', required: false, description: 'enable warning level logging', default: false},
    'info': {key: 'i', required: false, description: 'enable info level logging', default: false},
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
  defaultMapWidth = ops.map[0];
  defaultMapHeight = ops.map[1];
}
if (ops.telnetHost) {
  telnetHost = ops.telnetHost;
}

if (ops.telnetPort) {
  telnetPort = ops.telnetPort;
}

var express = require('express');
var geohash = require('geohash').GeoHash;

var net = require('net');
var http = require('http');

var fs = require('fs');
var path = require('path');

var app = express();

app.use('/js', express.static(__dirname  + '/js'));
/*
   app.get("/js/:file", function(req,res)
   {
   var file = req.params["file"];
   console.log("returning: " + file);
   res.sendfile('./js/' + file);
   });
   */

var showMap = function (req, res, options) {
  var lat = options.lat;
  if (lat == undefined) { lat = 0; }
  //if (lat == 0) { lat =42.402037710905496 ; }
  if (lat == 0) { lat =42.4021 ; }
  if (logLevel >= LOG_INFO) { console.log("lat : " + lat); }
  var lng = options.lng;
  if (lng == undefined) { lng = 0; }
  //if (lng == 0) { lng =-71.23397827148438; }
  if (lng == 0) { lng =-71.23411; }
  if (logLevel >= LOG_INFO) { console.log("lng : " + lng); }
  var zoom = options.zoom;
  if (zoom == undefined) { zoom = 0; }
  if (zoom == 0) { zoom = 13; }
  if (logLevel >= LOG_INFO) { console.log("zoom : " + zoom); }
  var mapWidth = options.mapWidth;
  if (mapWidth == undefined) { mapWidth = 0; }
  if (mapWidth == 0) { mapWidth = defaultMapWidth; }
  if (logLevel >= LOG_INFO) { console.log("mapWidth : " + mapWidth); }
  var mapHeight = options.mapHeight;
  if (mapHeight == undefined) { mapHeight = 0; }
  if (mapHeight == 0) { mapHeight = defaultMapHeight; }
  if (logLevel >= LOG_INFO) { console.log("mapHeight : " + mapHeight); }
  // now we use the templating capabilities of express and call our template
  // to render the view, and pass a few parameters to it
  render(req, res, lat, lng, zoom, mapWidth, mapHeight);
};

var showFromUrl = function(req, res) {
  if (logLevel >= LOG_INFO) { console.log("using url params ..."); }
  var lat = req.query.lat;
  var lng = req.query.lng;
  var zoom = req.query.zoom;
  var mapWidth = req.query.width;
  var mapHeight = req.query.height;
  showMap(req, res, { lat:lat, lng:lng, zoom:zoom, mapWidth:mapWidth, mapHeight:mapHeight});
}

function render(req, res, lat, lng, zoom, mapWidth, mapHeight) {
  // now we use the templating capabilities of express and call our template
  // to render the view, and pass a few parameters to it
  var mapStyle= "width:" + mapWidth + "px;height:" + mapHeight + "px;";
  var listHeight = mapHeight/2;
  if (listHeight < 200) { listHeight = 200; }
  var ww = (mapWidth - 20);
  if (ww < 300) { ww = 300; }
  var ww=300;
  var listStyle= 'width:'+ ww + "px;height:" + listHeight + "px;overflow:auto;";
  if (logLevel >= LOG_DEBUG) { console.log("rendering...") }
  res.render("index.ejs", { layout: false, lat:lat, lng:lng, zoom:zoom, mapStyle:mapStyle, listStyle:listStyle});
}

// route routing is very easy with express, this will handle the request for
// geo :id is used here to pattern match with the first value after the 
// forward slash.
app.get("/geo/:id",function (req,res) {
  var zzz = req.params.id;
  if (logLevel >= LOG_DEBUG) { console.log("decoding geohash: " + zzz); }
  //decode the geohash with geohash module
  var latlng = geohash.decodeGeoHash(zzz);
  if (logLevel >= LOG_INFO) { console.log("latlng : " + latlng); }
  var lat = latlng.latitude[2];
  var lng = latlng.longitude[2];
  var zoom = zzz.length + 2;
  showMap(req, res, { lat:lat, lng:lng, zoom:zoom } );
});

app.get("/latlng",function (req,res) {
  showFromUrl(req, res);
});

function returnFile(req, res, filePath)
{
  if (logLevel >= LOG_DEBUG) { console.log("REQUESTED FILE: " + filePath); }

  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (!err){
      if (logLevel >= LOG_DEBUG) { console.log('received data: ' + data); }
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.write(data);
      res.end();
    } else {
      console.log(err);
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.write("Unknown file: " + req.params.file);
      res.end();
    }

  });
}

app.get("/gpx/:file", function(req,res) {
  var filePath = path.join(__dirname, 'gpx', req.params.file.replace(/\.gpx$/,"")) + '.gpx';
  returnFile(req, res, filePath)
});

app.get("/kml/:file", function(req,res) {
  var filePath = path.join(__dirname, 'kml', req.params.file.replace(/\.kml$/,"")) + '.kml';
  returnFile(req, res, filePath)
});

// route routing is very easy with express, this will handle the request for
// root directory contents. :id is used here to pattern match with the first value 
// after the forward slash.
app.get("/:id",function (req,res) {
  var zzz = req.params.id;
  if (logLevel >= LOG_DEBUG) { console.log("decoding geohash: " + zzz); }
  //decode the geohash with geohash module
  var latlng = geohash.decodeGeoHash(zzz);
  if (logLevel >= LOG_DEBUG) { console.log("latlng : " + latlng); }
  var lat = latlng.latitude[2];
  if (logLevel >= LOG_DEBUG) { console.log("lat : " + lat); }
  var lng = latlng.longitude[2];
  if (logLevel >= LOG_DEBUG) { console.log("lng : " + lng); }
  var zoom = zzz.length + 2;
  if (logLevel >= LOG_DEBUG) { console.log("zoom : " + zoom); }
  var mapWidth = req.query.mapWidth;
  var mapHeight = req.query.mapHeight;
  // now we use the templating capabilities of express and call our template
  // to render the view, and pass a few parameters to it
  render(req, res, { lat:lat, lng:lng, zoom:zoom, mapWidth:mapWidth, mapHeight:mapHeight} );
});

var emulatorSocket = null;
var emulator = null;
if (logLevel >= LOG_INFO) { console.log('Attempting to connect to emulator at ' + telnetHost + ':' + telnetPort); }
var emulator = net.createConnection(telnetPort, telnetHost);

emulator.on('error', function (e) {
  console.log("Unable to connect to emulator at " + telnetHost + ':' + telnetPort);
});
emulator.on('connection', function(socket) {
  if (logLevel >= LOG_INFO) { console.log('connection to emulator established'); }
  socket.on('data', function(c) {
    var data = c + '';
    switch(data) {
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
var exec = require('child_process').exec;
var server = http.createServer(app).listen(9999);
var io = require('socket.io')(server);
//io.set('log level', logLevel); // info
var pts = {};
function sendGeo(key)
{
  if (logLevel >= LOG_INFO) { console.log("sendGeo " + key) }
  if (emulatorSocket == null) {
    var cmd = "geofix " + telnetHost + ' ' + telnetPort + ' ' + key;
    if (logLevel >= LOG_INFO) { console.log("exec: " + cmd); }
    exec(cmd, function(error, stdout, stderr) {
      if (logLevel >= LOG_INFO) { console.log('stdout: ' + stdout); }
      if (stderr != "") { console.log('stderr: ' + stderr); }
      if (error != null) {
        console.log('Exec ' + cmd + ': ' + error);
      }
    });
  }
  else {
    var msg = 'geo fix ' + key;
    if (logLevel >= LOG_INFO) { console.log("write: " + msg); }
    emulatorSocket.write(msg);
  }
}

io.sockets.on("connection", function(socket) {
  var msg_to_client = {
    data: "Connection to server established"
  };
  socket.send(JSON.stringify(msg_to_client));
  if (logLevel >= LOG_INFO) { console.log('socket.io Connection with client established'); }

  socket.on("message", 
    function(json) {
      data = JSON.parse(json);
      if (data.lng && data.lat) {
        var key = data.lng+' '+data.lat;
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

  var ack_to_client = {
    data: "Server Received point"
  };
  socket.send(JSON.stringify(ack_to_client));
    });
});
