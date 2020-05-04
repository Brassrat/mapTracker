const dom = (function () {
  'use strict';

  function createText(text) { return document.createTextNode(text) }

  function createElement(typ) { return (typ === 'text') ? createText('') : document.createElement(typ) }

  function _optFindId(id) { return document.getElementById(id) }

  function _isNode(onBehalfOf, node) {
    if (!node) {
      $Alert(`BAD CALL TO ${onBehalfOf} with NO node`);
    }
    return node;
  }

  function _findId(onBehalfOf, id) {
    if (!id) {
      $Alert(`BAD CALL TO ${onBehalfOf} with NO ID`);
    }
    else {
      let node = _optFindId(id);
      if (!node) {
        $Alert(`BAD CALL TO ${onBehalfOf} with ID ${id}`);
      }
      return node;
    }
    return undefined;
  }

  function _execNode(onBehalfOf, node, ff) { return _isNode(onBehalfOf, node) ? ff(node) : undefined }

  function _withNode(onBehalfOf, node, ff) {
    return _execNode(onBehalfOf, node, nn => {
      ff(nn);
      return nn
    })
  }

  function _optExecId(id, ff) {
    const node = _optFindId(id);
    return node ? ff(node) : undefined
  }

  function _optExecIdReturnNode(id, ff) {
    return _optExecId(id, node => {
      ff(node);
      return node
    })
  }

  function _checkedExecId(onBehalfOf, id, ff) {
    const nn = _findId(onBehalfOf, id);
    return nn ? ff(nn) : undefined;
  }

  function _checkedExecIdReturnNode(onBehalfOf, id, ff) {
    return _checkedExecId(onBehalfOf, id, nn => {
      ff(nn);
      return nn
    })
  }

  function boundingRectangle(node) { return node.getBoundingClientRect(); }

  function boundingRectangleId(id) { return _optExecId(id, boundingRectangle); }

  function newElement(typ, clz) { return _addClass(createElement(typ), clz) }

  function newText(text, clz) { return _addClass(createText(text), clz) }

  function newElementWithId(typ, id, clz) { return setId(newElement(typ, clz), id) }

  function addTip(inp, tip) {
    if (tip.upptooltip) {
      //inp['upptooltip'] = tip.upptooltip; // relative location, left/right/top/bottom/...
      inp.setAttribute('upptooltip', tip.upptooltip);
      if (tip.zIndex) {
        inp.style.zIndex = `'${tip.zIndex}'`;
      } // quotes??
      if (tip.width) {
        inp.style.setProperty('--upptooltip-width', tip.width);
      } // something like: calc(100% + 10px)
      // the --upptooltip-title custom property value must be a quoted string so we add quotes around value
      inp.style.setProperty('--upptooltip-title', `'${tip.title || 'TITLE'}'`)
    }
    else if (tip.title) {
      inp.title = tip.title || '';
    }
    else {
      inp.title = tip || '';
    }
    return inp;
  }

  function newInput(typ, name, value, clz) { return setValue(setName(setType(newElement('input', clz), typ), name), value) }

  function newButton(name, value, clz) {
    return newInput('button', name, value, clz);
  }

  function newCheckbox(name, value, clz) {
    return newInput('checkbox', name, value, clz);
  }

  function newFileInput(name, value, clz) {
    return newInput('file', name, '', clz);
  }

  function newOption(text, value, clz) { return _addClass(new Option(text, value), clz) }

  function addSelectOption(lst, text, value, clz) { return _appendChild(lst, newOption(text, value, clz)); }

  function newOptionalSelect(id, names, values, clz) {
    const lst = newElementWithId('select', id, clz);
    setId(lst, id); // lst.id = id;
    addSelectOption(lst, 'Any', '');
    return addSelectOptions(lst, names, values || {});
  }

  function newSelect(id, names, vv, title, clz) {
    const sel = newElementWithId('select', id, clz);
    // always allow the form to validate, see invalid listener below
    let values = vv || {};
    (names || {}).forEach(function (zz) {
      addSelectOption(sel, zz, values[zz] || zz, clz)
    });
    sel.setAttribute('title', title || '');
    return sel;
  }

  function fillOptionalSelectId(id, names, values) {
    return _checkedExecIdReturnNode('fillOptionalSelect', id, lst => {
      removeChildren(lst);
      addSelectOption(lst, 'Any', '');
      addSelectOptions(lst, names, values || {});
    })
  }

  function fillSelect(node, names, values) {
    return _withNode('fillSelect', node, lst => {
      removeChildren(lst);
      addSelectOptions(lst, names, values || {});
    });
  }

  function fillSelectId(id, names, values) {
    return _checkedExecIdReturnNode('fillSelectId', id, lst => { fillSelect(lst, names, values) })
  }

  function addSelectOptions(lst, names, values, clz) {
    if (lst) {
      if (!names) {
        $Alert('BAD CALL TO addSelectOptions, lst=' + lst.id);
      }
      else {
        names.sort().forEach(function (zz) {
                               addSelectOption(lst, zz, values[zz] || zz, clz)
                             },
        );
      }
    }
    return lst;
  }

  function _addClass(node, classesToAdd) {
    if (node && classesToAdd) {
      // W3 schools says this is not available in IE 9: btn.classList.add('graph');
      _withNode('addClass', node, nn => {
        let newer = nn.className;
        let have = newer.split(" ");
        let clzs = Array.isArray(classesToAdd) ? classesToAdd : classesToAdd.split(',');
        clzs.forEach(clz => {
          // note this breaks if class X is a substring of class Y
          if (have.indexOf(clz) === -1) {
            if (newer) {
              newer += ' ';
            }
            newer += clz;
          }
        });
        nn.className = newer;
      });
    }
    return node
  }

  function removeClass(node, classesToRemove) {
    if (node && classesToRemove) {
      // W3 schools says this is not available in IE 9: btn.classList.add('graph');
      _withNode('removeClass', node, nn => {
        let newer = '';
        let arr = nn.className.split(" ");
        let clzs = Array.isArray(classesToRemove) ? classesToRemove : classesToRemove.split(',');
        arr.forEach(clz => {
          if (clzs.indexOf(clz) === -1) {
            if (newer) {
              newer += ' ';
            }
            newer += clz;
          }
        });
        nn.className = newer;
      });
    }
    return node
  }

  function setId(node, id) { return setAttribute(node, 'id', id) }

  function _showId(id) { return setHidden(_optFindId(id), false) }

  function _hideId(id) { return setHidden(_optFindId(id), true) }

  function optShowId(id, show) { return _optExecId(id, nn => setHidden(nn, !show)) }

  function setHidden(node, hidden) {
    // this seems to work fine
    // although various comments about this indicate
    // setting display attribute to none is more correct
    // but then how do you set it back to the proper value? (e.g., block or inline or ...)
    // seems like setting a boolean value true/false preserves all the other attributes
    return _withNode('setHidden', node, nn => nn.hidden = hidden); // generates alert or something
    // how to choose between 'inline' and 'block', or ...
    //nn.display = hidden ? 'none' : 'inline';
  }

  function setAttribute(node, key, value) { return _withNode('setAttribute', node, nn => nn.setAttribute(key, value)); }

  function setHtmlContent(node, msg, add, rem) {
    if (node) {
      // allow for HTML entities
      //if (node) { node.innerHTML = (msg || ''); }
      // TODO - worry about IE8 and earlier?
      // we are replacing content, so remove all children first
      _addClass(removeClass(removeChildren(node), rem), add).insertAdjacentHTML('afterbegin', (msg || ''))
    }
    return node;
  }

  function setTextContent(node, msg, add, rem) {
    // TODO - worry about IE8 and earlier?
    if (node) {
      node.textContent = (msg === undefined) ? '' : msg;
      if (add) {
        _addClass(node, add);
      }
      if (rem) {
        removeClass(node, rem);
      }
    }
    return node;
  }

  function setText(node, value, add, rem) { return setTextContent(_isNode('setText', node), value, add, rem) }

  //function optTextId(id, value, add, rem) { return _optExecIdReturnNode(id, node => { setTextContent(node, value, add, rem) }) }

  function setTextId(id, value, add, rem) { return _checkedExecIdReturnNode('setTextId', id, node => { setText(node, value, add, rem) }) }

  function optShowTextId(id, value, add, rem) {
    return _optExecIdReturnNode(id, node => {
      setTextContent(node, value, add, rem);
      setHidden(node, (value.length <= 0))
    })
  }

  function _showHtmlId(id, value, add, rem) {
    return _optExecIdReturnNode(id, node => {
      setHtmlContent(node, value, add, rem);
      setHidden(node, (value.length <= 0))
    });
  }

  function setHiddenId(id, hidden) { return _optExecId(id, node => setHidden(node, hidden)) }

  function _clearTextId(id, clz) {
    // TODO - worry about IE8 and earlier?
    return _optExecIdReturnNode(id, node => {
      setHtmlContent(node, '', '', clz);
    })
  }


  //function optValueId(id, value) { return findNodeFunctionReturnNode(id, nn => nn.value = value); }

  function setName(node, value) { return _withNode('setName', node, nn => nn.name = value) }

  function setType(node, value) { return _withNode('setType', node, nn => nn.type = value) }

  function setValue(node, value) { return _withNode('setValue', node, nn => nn.value = value) }

  function setValueId(id, value) { return _optExecIdReturnNode(id, nn => nn.value = value) }

  function setChecked(node, value) { return _withNode('setChecked', node, nn => nn.checked = value) }

  function _appendChild(node, child) { return _withNode('appendChild', node, nn => nn.append(_isNode('appendChild', child))) }

  function _addChild(node, child) {
    _appendChild(node, child);
    return child; // return child NOT node
  }

  function _addTable(parent, clz) { return _addChild(parent, newElement('table', clz)) }

  function _withRow(tbl, clz) { return _addChild(tbl, newElement('tr', clz)) }

  /**
   * @param row
   * @param clz
   * @returns td new column (i.e., the td)
   */
  function addColumn(row, clz) { return _addClass(row.insertCell(-1), clz);}

  /**
   *
   * @param row
   * @param entry
   * @param clz
   * @returns row
   */
  function _addEntryColumn(row, entry, clz) { return _addChild(addColumn(row, clz), entry)}

  function _withEntryColumn(row, entry, clz) {
    _addChild(addColumn(row, clz), entry);
    return row;
  }

  /**
   * @param row
   * @param txt
   * @param clz
   * @returns row
   */
  function _addTextColumn(row, txt, clz) {
    let col = addColumn(row, clz);
    // removeChildren(col); not needed here since the new col element can't have any children
    col.insertAdjacentHTML('afterbegin', txt);
    return col;
  }

  function _withTextColumn(row, txt, clz) {
    _addTextColumn(row, txt, clz);
    return row;
  }

  // function addItem(lst, subId, left, right, clz) {
  //   let li = newElementWithId('li', subId, clz).textContent(left);
  //   if (right) {
  //     _appendChild(_appendChild(li, createText(': ')), createText(right));
  //   }
  //   return _appendChild(lst, li);
  // }

  function _addList(parent, clz) { return _addChild(parent, newElement('ul', clz)) }

  // use node.substring to detect if node is a string value
  // if node is a string value then it is the id of a dom element; otherwise it should be some dom element itself
  function hasChildren(node) { return node ? (node.substring ? hasChildrenId(node) : node.hasChildNodes()) : false }

  function removeChildren(node) {
    if (node) {
      while (node.hasChildNodes()) {
        node.removeChild(node.lastChild)
      }
    }
    return node;
  }

  function removeChildrenId(id) { return _optExecIdReturnNode(id, removeChildren) }

  function makeCheckboxList(id, values, clz) {
    const cbs = [];
    _checkedExecIdReturnNode('makeCheckboxList', id, lst => {
      removeChildren(lst);
      let tbl = _addTable(lst, clz);
      values.forEach(zz => {
        let cb = setChecked(newCheckbox(zz, zz, clz), true);
        _appendChild(tbl, _withTextColumn(_withEntryColumn(_withRow(tbl, clz), cb, clz), zz, clz));
        cbs.push(cb);
      });
    });
    return cbs
  }

  function setCheckboxList(cbs, selected) {
    cbs.forEach(zz => setChecked(zz, selected));
  }


  /**
   * Parse string as JSON
   * @param json the string
   * @returns JSON Object (i.e., a dictionary)
   */
  function _parseJson(json) {
    try {
      return ((('string' === typeof json) || (json instanceof String)) && (json.trim().substr(0, 1) === '{')) ? JSON.parse(json) : json;
    }
    catch (error) {
      $Alert(`Unable to parse ${json} because ${error}`)
    }
    return json;
  }

  function nodeText(node) { return (node || {}).textContent }

  function nodeValue(node) { return (node || {}).value }

  function nodeChildValue(node) { return (node.childNodes[0] || {}).value; }

  //function nodeChildId(node) { return (node.childNodes[0] || {}).id; }

  function setNodeChildValue(node, value) { setValue(node.childNodes[0], value) }

  function getSelectedId(lstId) {
    return _checkedExecId('getSelected', lstId, lst => { return nodeValue(lst[lst.selectedIndex]) })
  }

  function _getIdOfNode(node) { return _execNode('_getIdOfNode', node, nn => nn.id) }

  function _getValueOfNode(node) { return _execNode('getValueOfNode', node, nn => nn.value) }

  function _getValueId(id) { return _checkedExecId('getValueId', id, nn => {return nn.value}) }

  function hasChildrenId(id) { return _optExecId(id, node => { return node.hasChildNodes() }) || false }

  function insertFirst(container, elem) {
    container.insertBefore(elem, container.firstChild);
    return elem;
  }

  function appendLast(container, elem) {
    container.appendChild(elem);
    return elem;
  }

  return Object.freeze({
                         _withRow
                         , _addChild
                         , _addTable
                         , _appendChild
                         , _execNode
                         , _findId
                         , _checkedExecIdReturnNode
                         , _getIdOfNode
                         , _getValueId
                         , _getValueOfNode
                         , _optExecId
                         , _optExecIdReturnNode
                         , _optFindId
                         , _parseJson
                         , _withNode
                         , _addClass
                         , _hideId
                         , _showId
                         , _showHtmlId
                         , _addEntryColumn
                         , _addList
                         , _addTextColumn
                         , _withTextColumn
                         , _clearTextId
                         // functions referenced via dom.
                         // first functions that have external constant references
                         , appendLast
                         , addTip
                         , boundingRectangleId
                         , fillOptionalSelectId
                         , fillSelect
                         , fillSelectId
                         , getSelectedId
                         , insertFirst
                         , hasChildren
                         , hasChildrenId
                         , makeCheckboxList
                         , newElement
                         , newElementWithId
                         , newOptionalSelect
                         , newSelect
                         , newText
                         , newFileInput
                         , newCheckbox
                         , newButton
                         , nodeChildValue
                         , nodeText
                         , optShowId
                         , optShowTextId
                         //, optTextId
                         , removeChildren
                         , removeChildrenId
                         //, removeClass
                         , setAttribute
                         , setCheckboxList
                         , setChecked
                         , setHidden
                         , setHiddenId
                         , setHtmlContent
                         , setId
                         , setName
                         , setNodeChildValue
                         , setText
                         , setTextId
                         , setValue
                         , setValueId,
                       });

}());

/* TODO - add object types with methods */

const $ShowId = dom._showId;
const $ShowHtmlId = dom._showHtmlId;
const $HideId = dom._hideId;

const $ClearTextId = dom._clearTextId;

const $F = dom._optFindId; // (id) no alert, return undefined
const $FFN = dom._optExecIdReturnNode; // (id, ff) no alert, return

const $E = dom._findId; // (id) alert if not found
const $EFN = dom._checkedExecIdReturnNode; // (id, ff) eval ff(nn); return node

const $EV = dom._getValueId; // (id)

const $NF = dom._execNode;
const $NFN = dom._withNode;
const $NV = dom._getValueOfNode; // (node)
const $NI = dom._getIdOfNode;
const $Nappend = dom._appendChild;

const $NewBreak = function () { return dom.newElement('br') };
const $NewDiv = function (clz) { return dom.newElement('div', clz) };
const $NewText = function (text, clz) { return dom.newText(text, clz); };
const $NewHtml = function (text, clz) {
  let nn = dom.newElement('span', clz);
  nn.innerHTML = text;
  return nn;
};
//const $AddSpan = function(clz) { return dom._addClass(dom.newElement('span'), clz); }

const $NewTextInput = function (id, size, tip, clz) {
  let ee = dom.newElementWithId('input', id, clz);
  ee.size = size || 16;
  dom.addTip(ee, tip);
  return ee;
};

const $AddDiv = function (parent, clz) { return dom._addChild(parent, $NewDiv(clz)) };

function $NewFileInput(id, tip, clz, fn) {
  let div = $NewDiv(clz);
  dom.addTip(div, { upptooltip: 'top', title: tip, width: 'calc(20em)' }); // or 26em?
  let fileInput = dom.setId(dom.newFileInput(id, clz), id);
  fileInput.addEventListener('click', function (inp) { this.value = null; });
  fileInput.addEventListener('cancel', function (inp) { console.log('cancel'); });
  fileInput.addEventListener('change', function (inp) { fn(this)});
  dom._addChild(div, fileInput);
  return div;
}

//const $AddClass = dom._addClass;
//const $RemoveClass = dom.removeClass;

const $AddTable = dom._addTable;
const $AddRow = dom._withRow;
const $AddEntryColumn = dom._addEntryColumn;
const $AddTextColumn = dom._addTextColumn;
const $WithTextColumn = dom._withTextColumn;

const $AddList = dom._addList;
const $RemoveChildren = dom.removeChildren;

const $NewOptionalSelect = dom.newOptionalSelect;
const $NewSelect = dom.newSelect;
const $FillOptionalSelectId = dom.fillOptionalSelectId;
const $FillSelectId = dom.fillSelectId;

const $SelectV = dom.getSelectedId;

const parseJson = dom._parseJson;

/**
 * Tries various vendor prefixes and returns the first supported property.
 */
const $Vendor = function (el, prop) {
  if (el.style[prop] !== undefined) { return prop; }
  // needed for transform properties in IE 9
  let prefixed = 'ms' + prop.charAt(0).toUpperCase() + prop.slice(1);
  return (el.style[prefixed] !== undefined) ? prefixed : '';
};

/**
 * Sets multiple style properties at once.
 */
const $CSS = function css(el, props) {
  for (const [prop, vv] of Object.entries(props)) {
    el.style[$Vendor(el, prop) || prop] = vv
  }
  return el;
};

// vim: sw=2 ts=2 ic scs :
