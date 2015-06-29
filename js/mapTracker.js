
function startSocket()
{
  var socket = io.connect("/");

  /*Initializing the connection with the server via websockets */
  socket.on("message",function(message){
    /*
       When server sends data to the client it will trigger
       "message" event on the client side , by
       using socket.on("message") , one can listen for the
       message event and associate a callback to
       be executed . The Callback function gets the data sent
       from the server
       */
    console.log("Message from the server arrived: " + message)
    message = JSON.parse(message);
  });
  return socket;
}

function sendLatLng(lat, lng)
{
  // create a JS object
  var data = {
    lat: lat,
    lng: lng
  };
  // send JSON string form of object to server
  socket.send(JSON.stringify(data));
  /* This triggers a message event on the server side
     and the event handler obtains the data sent */
}

function addMarker(map, latLng)
{
  markerId += 1;
  //animation: google.maps.Animation.DROP,
  var marker = new google.maps.Marker({
    id: markerId,
      position: latLng,
      map: map,
      title:latLng.toString()
  });
  sendLatLng(latLng.lat(), latLng.lng());
  return marker;
};

function removeMarker(marker)
{
  //alert("delete marker: " + marker.toString());
  marker.setMap(null);
  return null;
};

function rmRow(anchor)
{
  //alert("rmRow: " + anchor.title);
  if (anchor.row != null)
  {
    if (anchor.row.marker != null)
    {
      marker = anchor.row.marker;
      removeMarker(marker);
      var rows = document.getElementById('latLngTable').getElementsByTagName('tbody')[0];
      for (ii = 0; ii < rows.children.length; ++ii)
      {
        var tr = rows.children[ii];
        if (typeof(tr.marker) != 'undefined')
        {
          if (tr.marker == marker)
          {
            rows.deleteRow(ii);
            break;
          }
        }
      }
    }
  }
  return false;
};

var rad = function(x) {
  return x * Math.PI / 180;
};

var getDistance = (function() {
    return {
      inMeters: function(p1, p2) {
        var R = 6378137; // Earth’s mean radius in meter
        var dLat = rad(p2.lat() - p1.lat());
        var dLong = rad(p2.lng() - p1.lng());
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
                Math.sin(dLong / 2) * Math.sin(dLong / 2);
        //  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var c = 2 * Math.asin(Math.sqrt(a));
        var d = R * c;
        return (d).toFixed(4); // returns the distance in meter
      },
    inFeet: function(p1, p2) {
      return (3.280839895 * getDistance.inMeters(p1, p2)).toFixed(2);
    }
    };
    })();

var map = null;
var updateTimeout = null;
var startLocation = null;
var clickLocation = null;
var clickZoom = null;

function insertMarker()
{
  // Insert a row in the table at the last row

  //var lst = document.getElementById("list");
  var tableRef = document.getElementById('latLngTable').getElementsByTagName('tbody')[0];

  if (tableRef.rows.length <= 0) { startLocation = clickLocation; }
  var newRow = tableRef.insertRow(tableRef.rows.length);
  newRow.marker = addMarker(map, clickLocation);
  var ii = 0;
  newRow.insertCell(ii++).appendChild(document.createTextNode(clickLocation.lat().toFixed(4).toString()));
  newRow.insertCell(ii++).appendChild(document.createTextNode(clickLocation.lng().toFixed(5).toString()));

  var anchor = document.createElement('a');
  anchor.href='#';
  anchor.innerHTML = 'delete';
  anchor.title = "delete " + clickLocation.toString();
  anchor.row = newRow;
  anchor.setAttribute('onclick', "return rmRow(this)");

  var cell = newRow.insertCell(ii++);
  var el_span = document.createElement('span');
  el_span.setAttribute('class', 'center');
  el_span.appendChild(anchor);
  cell.appendChild(el_span);

  var prevRow = tableRef.rows.length-2;
  if (prevRow < 0) { prevRow = 0; }
  var prevLocation = tableRef.rows[prevRow].marker.position;
  var dist = document.createTextNode(getDistance.inFeet(prevLocation, clickLocation).toString());

  cell = newRow.insertCell(ii++);
  el_span = document.createElement('span');
  el_span.setAttribute('class', 'numericCell');
  el_span.appendChild(dist);
  cell.appendChild(el_span);
}

function moveCenter(map, latLng) {
  map.setCenter(latLng);
  document.getElementById("cntr_lat").innerHTML= latLng.lat().toFixed(5);
  document.getElementById("cntr_lng").innerHTML= latLng.lng().toFixed(6);
  document.getElementById("zoom").innerHTML = map.getZoom().toString();
};

function loadMap(lat, lng, zoom)
{
  var myOptions = {
    center: new google.maps.LatLng(lat, lng), 
    zoom: zoom,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    draggableCursor: 'crosshair'
  };
  map = new google.maps.Map(document.getElementById("map"), myOptions);
  var cntr = map.getCenter();
  document.getElementById("cntr_lat").innerHTML= cntr.lat().toFixed(5);
  document.getElementById("cntr_lng").innerHTML= cntr.lng().toFixed(6);
  document.getElementById("zoom").innerHTML = map.getZoom().toString();

  google.maps.event.addListener(map, 'center_changed', function() {
    var latLng = map.getCenter();
    document.getElementById("cntr_lat").innerHTML= latLng.lat();
    document.getElementById("cntr_lng").innerHTML= latLng.lng()
  });

  google.maps.event.addListener(map, 'zoom_changed', function(evXX) {
    document.getElementById("zoom").innerHTML = map.getZoom().toString();
  });

  google.maps.event.addListener(map, 'click', function(event) {
    clickLocation = event.latLng;
    clickZoom = map.getZoom();
    updateTimeout = setTimeout("insertMarker();", 400);
    return false;
  });

  google.maps.event.addListener(map, 'dblclick', function(event) {
    clearTimeout(updateTimeout);
  });

  google.maps.event.addListener(map, 'rightclick', function(event) {
    moveCenter(map, event.latLng);
    return false;
  });

};

