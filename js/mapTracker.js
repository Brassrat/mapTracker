let markerId = 0;

function startSocket () {

  /*Initializing the connection with the server via websockets */
  nodeServer.fromServer('message', function (message) {
    /*
       When server sends data to the client it will trigger
       "message" event on the client side , by
       using socket.on("message") , one can listen for the
       message event and associate a callback to
       be executed . The Callback function gets the data sent
       from the server
       */
    console.log('Message from the server arrived: ' + message);
  });

  nodeServer.fromServer('saved', function(msg) {
    if (typeof msg === 'string') {
      alert(msg)
    }
    else if (msg.path) {
      alert(`saved in ${msg.path}`)
    }
  });

  nodeServer.fromServer('loaded', function(msg) {
    if (typeof msg === 'string') {
      alert(msg)
    }
    else {
      let { name, path, kml = false, json = true, points, targets, center = {lat: null, lng: null}, zoom=12 } = msg;
      //alert(`loaded in ${path}`)
      if (center.lat === null) {
        center.lat = points[0].lat;
        center.lng = points[0].lng;
      }
      points.forEach(pt => {
        insertMarker(pt.lat, pt.lng, false, false, false);
      })
      targets.forEach(pt => {
        insertMarker(pt.lat, pt.lng, true, false, false);
      })
      setCenter(center);
      setZoom(zoom);
    }
  });
}

function saveRoute() {
  const latLng = theMap.getCenter();
  const zoom = theMap.getZoom();
  nodeServer.toServer('save', {name : $EV('fname'), points, targets, zoom, center: {lat: latLng.lat(), lng: latLng.lng()}});
}

function loadRoute() {
  nodeServer.toServer('load', {name: $EV('fname')});
}

function sendLatLng (lat, lng, isTarget = false) {
  nodeServer.toServer('point', { lat: lat, lng: lng, target: isTarget });
  /* This triggers a message event on the server side
     and the event handler obtains the data sent */
}

function addMarker (map, latLng, isTarget) {
  markerId += 1;
  //animation: google.maps.Animation.DROP,
  let color = isTarget ? 'red' : 'blue';
  var marker = new google.maps.Marker({
    id: markerId,
    position: latLng,
    map: map,
    title: JSON.stringify(latLng),
    label: isTarget ? "T" : "P",
    icon: {
      url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
    }
  });
  sendLatLng(latLng.lat, latLng.lng, isTarget);
  return marker;
}

function removeMarker (marker) {
  //alert("delete marker: " + marker.toString());
  //nodeServer.toServer('point', { lat: lat, lng: lng, target: isTarget });
  marker.setMap(null);
  return null;
}

function rmRow (tbl, anchor) {
  //alert("rmRow: " + anchor.title);
  if (anchor.row != null) {
    if (anchor.row.marker != null) {
      let marker = anchor.row.marker;
      removeMarker(marker);
      const rows = document.getElementById(tbl).getElementsByTagName('tbody')[0];
      const locs = (tbl === 'targetTable') ? targets : points;
      for (ii = 0; ii < rows.children.length; ++ii) {
        const tr = rows.children[ii];
        if (typeof (tr.marker) != 'undefined') {
          if (tr.marker === marker) {
            rows.deleteRow(ii);
            locs.splice(ii, 1);
            // have to update dist and totDist for all following points
            for (jj = ii; jj < locs.length; ++jj) {
              let tot = (jj <= 0) ? 0 : locs[jj-1].totDist;
              locs[jj].dist = (jj <= 0) ? 0 : getDistance.inFeet(locs[jj-1], locs[jj]);
              locs[jj].totDist = tot + locs[jj].dist;
              // have to update ui

              setDistance(rows.children[jj], 2, Math.round(locs[jj].dist * 100) / 100);
              setDistance(rows.children[jj], 3, Math.round((locs[jj].totDist * 100) / 5280) / 100);
            }
            break;
          }
        }
      }
    }
  }
  return false;
}

var rad = function (x) {
  return x * Math.PI / 180;
};

var getDistance = (function () {
  return {
    between: function (p1, p2) {
      var R = 6378137; // Earth’s mean radius in meter
      var dLat = rad(p2.lat - p1.lat);
      var dLong = rad(p2.lng - p1.lng);
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
          Math.sin(dLong / 2) * Math.sin(dLong / 2);
      //  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var c = 2 * Math.asin(Math.sqrt(a));
      var d = R * c;
      return (d); // returns the distance in meter
    },
    betweenFeet: function (p1, p2) {
      return 3.280839895 * this.between(p1, p2);
    },
    betweenMile: function (p1, p2) {
      return ((this.betweenFeet(p1, p2) * 100) / 5280).toFixed(2);
    },
    inMeters: function (p1, p2) {
      return this.between(p1, p2).toFixed(3); // returns the distance in meter
    },
    inFeet: function (p1, p2) {
      return this.betweenFeet(p1, p2).toFixed(2);
    },
  };
})();

var theMap = null;
var updateTimeout = null;
var startLocation = null;

let points = [];
let targets = [];
var ctrldn = false;
var shiftdn = false;
var altdn = false;

function keyEventDn(event) {
  switch(event.which) {
    case 16:
      shiftdn = true;
      break;
    case 17:
      ctrldn = true;
      break;
  }
}

function keyEventUp(event) {
  switch(event.which) {
    case 16:
      shiftdn = false;
      break;
    case 17:
      ctrldn = false;
      break;
  }
}

/**
 * Add marker to map and Insert a row in the table at the last row
 * @param event
 */
function insertEvent (markerData) {
  let {location, shiftdn, ctrldn, altdn } = markerData;
  insertMarker(location.lat(), location.lng(), shiftdn, ctrldn, altdn);
}

function insertMarker(lat, lng, shiftdn, ctrldn, altdn) {
  if (ctrldn || altdn) {
    return; // ignore ctrl clicks for now
  }
  // let clickZoom = theMap.getZoom());
  const tbl = shiftdn ? 'targetTable' : 'latLngTable';
  const locs = shiftdn ? targets : points;

  const tableRef = document.getElementById(tbl).getElementsByTagName('tbody')[0];
  let curLocation = { lat, lng };
  if (tableRef.rows.length <= 0) { startLocation = curLocation; }

  let name = '';
  let dist = 0;
  let totDist = 0;
  if (locs.length > 0) {
    let prevPt = locs.length - 1;
    let prevLocation = locs[prevPt];
    dist = getDistance.betweenFeet(prevLocation, curLocation);
    totDist = locs[prevPt].totDist + dist;
  }
  if (locs === targets) {
    locs.push({ name, lat, lng,});
  }
  else {
    locs.push({ lat, lng, dist, totDist });
  }

  const newRow = tableRef.insertRow(tableRef.rows.length);
  // locs.length === tableRef.rows.length
  let ii = 0;
  if (locs === targets) {
    newRow.insertCell(ii++).appendChild(document.createTextNode(name));
  }
  newRow.insertCell(ii++).appendChild(document.createTextNode(lat.toFixed(5)));
  newRow.insertCell(ii++).appendChild(document.createTextNode(lng.toFixed(6)));
  if (locs === points) {
    let ff = (dist < 1000) ? 2 : 0;
    addDistance(newRow, ii++, dist.toFixed(ff));
    let dd = totDist / 5280;
    ff = (dd < 100) ? 2 : 0;
    addDistance(newRow, ii++, dd.toFixed(ff));
  }
  pt = {lat,lng};
  addDelete(tbl, newRow, ii++, pt);

  newRow.marker = addMarker(theMap, pt, shiftdn);
}

function setDistance(row, col, vv) {
  row.cells[col].children[0].textContent = vv.toString();
}

function addDistance (newRow, col, vv) {
  const cell = newRow.insertCell(col);
  const el_span = document.createElement('span');
  el_span.setAttribute('class', 'numericCell');
  el_span.appendChild(document.createTextNode(vv.toString()));
  cell.appendChild(el_span);
}

function addDelete (tbl, newRow, col, pt) {
  const anchor = document.createElement('a');
  anchor.href = '#';
  anchor.innerHTML = 'del'; // TODO - use image
  anchor.title = 'delete ' + JSON.stringify(pt);
  anchor.row = newRow;
  anchor.setAttribute('onclick', `return rmRow("${tbl}", this)`);
  const cell = newRow.insertCell(col);
  const el_span = document.createElement('span');
  el_span.setAttribute('class', 'center');
  el_span.appendChild(anchor);
  cell.appendChild(el_span);
}

function showCenter () {
  const latLng = theMap.getCenter();
  document.getElementById('cntr_lat').innerHTML = latLng.lat().toFixed(5);
  document.getElementById('cntr_lng').innerHTML = latLng.lng().toFixed(6);
  document.getElementById('zoom').innerHTML = theMap.getZoom().toString();
}

function setZoom(zoom) {
  theMap.setZoom(zoom);
}

function setCenter(center) {
  theMap.setCenter(center);
  showCenter();
}

function moveCenter (map, latLng) {
  map.setCenter(latLng);
  showCenter();
}

function initTheMap () {
  let { lat, lng, zoom } = mapLoadOptions;
  loadTheMap(lat, lng, zoom);
}

function loadTheMap (lat, lng, zoom) {
  const myOptions = {
    center: { lat, lng },
    zoom: zoom,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    draggableCursor: 'crosshair',
  };

  theMap = new google.maps.Map(document.getElementById('map'), myOptions);
//<body onkeydown="keyEventDn" onkeyup="keyEventUp">
  let bdy = document.getElementsByTagName('body');
  bdy[0].addEventListener('keydown', keyEventDn)
  bdy[0].addEventListener('keyup', keyEventUp)

  google.maps.event.addListener(theMap, 'center_changed', function () {
    showCenter();
  });

  google.maps.event.addListener(theMap, 'zoom_changed', function (evXX) {
    document.getElementById('zoom').innerHTML = theMap.getZoom().toString();
  });

  google.maps.event.addListener(theMap, 'click', function (event) {
    // delay a little to handle 'slow' double click ...
      updateTimeout = setTimeout(insertEvent, 400, { location: event.latlng, shiftdn, ctrldn, altdn} );
    return false;
  });

  google.maps.event.addListener(theMap, 'dblclick', function (event) {
    clearTimeout(updateTimeout);
  });

  google.maps.event.addListener(theMap, 'rightclick', function (event) {
    moveCenter(theMap, event.latLng);
    return false;
  });

  showCenter();
}

