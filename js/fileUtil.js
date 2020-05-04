const fileUtil = (function () {
  'use strict';

  function readJson(inp, onSuccess, onError) {
    return readText(inp, result => {
      try {
        onSuccess(JSON.parse(result));
      }
      catch (ex) {
        onError({type: ex.message})
      }
    }, onError)
  }

  function readText(inp, onSuccess, onError) {
    if (inp.files.length === 1) {
      let nm = inp.files[0].name;
      let rdr = new FileReader();
      rdr.onloadend = ev => { onSuccess(nm, ev.target.result) };
      if (onError) { rdr.onerror = ev => onError(nm, ev); }
      rdr.readAsText(inp.files[0]);
      return nm;
    }
    return '';
  }

  function saveData(fmt, fn, sfx, mime, dataType, data) {
    if (!fn) {
      switch (fmt) { // see FileFormats
        case 'json':
        case 'ui':
          fn = 'search';
          break;
        default:
          fn = 'text';
          break;
      }
    }

    let href = `data:${mime}${dataType},${data}`;
    let fname = `${fn}.${sfx}`;
    download(href, fname, mime);
    return fname;
  }

  function saveText(fn, text) {
    return saveData('text', fn, 'txt', 'text/plain', ';charset=utf-8', encodeURIComponent(text));
  }

  function saveJson(fn, text) {
    // if text is a string then JSON.stringify winds up escaping all the quotes,
    // so parse it into a JSON object first, then stringify the JSON object
    let txt = JSON.stringify(parseJson(text), null, 2);
    return saveData('json', fn, 'json', 'text/plain', ';charset=utf-8', encodeURIComponent(txt));
  }

  return Object.freeze({
                         readJson
                         , readText
                         , saveJson
                         , saveText
                       })
})();

// vim: sw=2 ts=2 ic scs :
