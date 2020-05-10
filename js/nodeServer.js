const nodeServer = (function () {
  'use strict';

  const socket = io();

  function toServer (key, value) {
    socket.emit(key, value);
  }

  function fromServer (key, f) {
    socket.on(key, f);
  }

  return Object.freeze(
      {
        toServer,
        fromServer,
      },
  );

}());
// vim: set sw=2 ts=2 ic scs :
