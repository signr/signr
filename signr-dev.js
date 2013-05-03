/** Copyright 2013 http://signr.github.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

var signr = function(win, doc, undefined) {
"use strict";

var
  addEventListener = !!doc.addEventListener,  //true if supported
  ie8 = win.ActiveXObject && !addEventListener,  //ie8 and under
  ie7 = ie8 && !doc.querySelector,  //ie7 and under
  ie6 = ie7 && !win.XMLHttpRequest,

  progid = "filter:progid:DXImageTransform.Microsoft.",
  px = "px",
  className = "className",

  //copies all properties from origin object to target
  mixin = function(t, o) {
    for(var i in o) t[i] = o[i];
    return t;
  },

  //shortcut for "getElementById" with detection if param is already a node
  byId = function(s) {
    return s && s.charAt ? doc.getElementById(s) : s;
  },

  //shortcut for "insertBefore". 3rd param is a toggle for insertAfter.
  insBefore = function(n, ref, after) {
    return ref.parentNode.insertBefore(n, after ? ref.nextSibling : ref);
  },

  //shortcut for "removeChild"
  remove = function(n) {
    n = byId(n);
    n.parentNode.removeChild(n);
  },

  //shortcut for "setAttribute", "getAttribute"
  attr = function(n, a, value) {
    if(value !== undefined) {
      n.setAttribute(a, value);
    } else {
      return n.getAttribute(a);
    }
  },

  vendor,  //holds vendor specific CSS prefix

  //gets or sets a CSS property and accepts a hash of CSS properties to set
  css = win.getComputedStyle ? function(n, style, value) {
    if(!style.charAt) {
      for(value in style) css(n, value, style[value]);
      return;
    }

    if(value !== undefined) {
      n = n.style;
      if(style in n) return n[style] = value;
    } else {
      n = getComputedStyle(n, null);
      if(style in n) return n[style];
    }

    if(!vendor) {
      vendor =
        ("-webkit-" + style in n) ? "-webkit-" :
        ("-moz-" + style    in n) ? "-moz-" :
        ("-ms-" + style     in n) ? "-ms-" :
        ("-o-" + style      in n) ? "-o-" : null;
    }
    style = vendor + style;

    if(value !== undefined) {
      if(style in n) n[style] = value;
    } else {
      if(style in n) return n[style];
    }

  } : function(n, style, value) {  //IE<8 support
    if(!style.charAt) {
      for(value in style) css(n, value, style[value]);
      return;
    }

    if(value !== undefined) {
      n.style[style] = value;
    } else {
      return n.currentStyle[style];
    }
  },

  //shortcut to add "className"
  addClass = function(n, str, _) {
    _ = " ";
    if((_ + n[className] + _).indexOf(_ + str + _) < 0) n[className] += _ + str;
  },

  //shortcut to remove "className"
  delClass = function(n, str, _, name) {
    _ = " ";
    name = _ + n[className] + _;
    str = _ + str + _;
    if(name.indexOf(str) >= 0) {
      str = name.replace(str, _);
      n[className] = str.substring(1, str.length - 1);
    }
  },

  //converts an HTML string to a single node
  make = function(str, n) {
    n = doc.createElement("b");
    n.innerHTML = str;
    return n.firstChild;
  },

  //shortcut to "addEventListener"
  onEvent = addEventListener ? function(n, type, fn) {
    n.addEventListener(type, fn, false);
  } : function(n, type, fn) {
    n.attachEvent("on" + type, dn);
  },

  //shortcut to "removeEventListener"
  unEvent = addEventListener ? function(n, type, fn) {
    n.removeEventListener(type, fn, false);
  } : function(n, type, fn) {
    n.detachEvent("on" + type, dn);
  },

  //shortcut to "preventDefault"
  stopEvent = function(e) {
    if(e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
      e.returnValue = false;
    }
  },

  //gets how much the page has scrolled -> {x:0, y:0}
  scrolled = function(n, fn) {
    if(isNaN(win.pageXOffset)) {
      n = doc.documentElement || doc.body.parentNode;

      if(isNaN(n.scrollTop)) n = doc.body;

      fn = function() {
        return {x:n.scrollLeft, y:n.scrollTop};
      };
    
    } else {
      fn = function() {
        return {x:win.pageXOffset, y:win.pageYOffset};
      };
    }

    return fn = (S.scrolled = scrolled = fn)();
  },

  //gets the size and position of a node relative to the page -> {x:0, y:0, w:0, h:0}
  pos = make("<p>").getBoundingClientRect ? function(n, scroll) {
    n = n.getBoundingClientRect();
    scroll = (n != doc.body) ? S.scrolled() : {x:0, y:0};
    return {
      x: n.left + scroll.x,
      y: n.top + scroll.y,
      w: n.right - n.left,
      h: n.bottom - n.top
    };
  } : function(n, n2, x, y) {
    x = y = 0, n2 = n;
    while(n && n.nodeType == 1) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n =  n.offsetParent;
    }
    return {
      x: x,
      y: y,
      w: n2.offsetWidth,
      h: n2.offsetHeight
    }
  },

  //makes one node the same size and position as the 2nd node with
  //optional padding (pad = {x:0, y:0, h:0, w:0})
  cover = function(node, to, pad, cssPos) {
    cssPos = css(to, "position") == "static"  ? "static" : "absolute";
    to = pos(to);
    pad = mixin({x:0, y:0, w:0, h:0}, pad);
    css(node, {
      left: (to.x - pad.x) + px,
      top: (to.y - pad.y) + px,
      width: (to.w + pad.w) + px,
      height: (to.h + pad.h) + px,
      position: cssPos
    });
  },

  //converts a comma separated list into a hash object
  csv2obj = function(str, obj) {
    obj = obj || {};
    if(str) str = str.replace(/([^,=]+)(?:=([^,]+))?/g, function(_, n, v) {
      obj[n] = v;
    });
    return obj;
  },

  //ensures a node has an ID, or if not assigns it a unique ID
  ensureHasID = function(n) {
    if(!n.id) n.id = "xsignr" + S.uniq++;
    return n.id;
  },

  //a hashmap of all popups that are visible on screen
  showing = {},

  //show a popup
  show = function(ext, node, options, event) {
    var i, fx, extID, nodeID;

    //get options from various sources. We need to get the options
    //first because "ext" and "node" can be null and set by a plugin
    options = mixin(csv2obj(options), S.defs);
    if(ext) {
      ext = byId(ext);
      extID = options.extID = ensureHasID(ext);
      csv2obj(attr(ext, "data-signr"), options);
    }
    if(node) {
      node = byId(node);
      nodeID = options.nodeID = ensureHasID(node);
      csv2obj(attr(node, "data-signr"), options);
    }

    //mixin hints. Hints allow one option to expand into multiple options.
    //e.g., {speechbubble:1} -> {speechbubble:1, fadein:1, roundedge:1}
    for(i in options) {
      if(S.hints[i]) mixin(options, S.hints[i]);
    }

    //hereonafter we pass the call to the plugins. Each plugin can contain
    //4 functions which we call if they exist: "adjust, position, show, hide".

    //allow plugins to adjust the options before we do anything
    for(i in options) {
      fx = S.fx[i];
      if(fx && fx.adjust) fx.adjust(ext, node, options, event);
    }

    //"adjust" may give us new nodes, so re-get them
    ext = byId(options.extID);
    node = byId(options.nodeID);

    //if popup is already showing and invoked by same source, then ignore
    //so that multiple mouseovers won't interfere.
    //But if the options obj contains the "toggle" param, then hide the 
    //popup. Toggle allows any non-user action to hide the popup.
    //Note "toggle" can be set by a hint and not necessarily by the user.
    if(isShowing(extID) && showing[extID].nodeID == nodeID) {
      if("toggle" in options) hide(ext, event);
      return;
    }

    //otherwise ignore
    if(isShowing(extID)) {
      if(!("toggle" in options)) return;
      hide(ext, event);
    }

    //persist the options until the popup is hidden
    showing[options.extID] = options;

    //must make the popup visible first so that offsetHeight can be 
    //read. Plugins can still animate the visibility of the popup 
    //later.
    css(ext, {
      display: "",
      position: css(ext, "position") == "fixed" ? "fixed" : "absolute"
    });
    delClass(ext, "signr-hide");

    //position the popup
    for(i in options) {
      fx = S.fx[i];
      if(fx && fx.position) fx.position(ext, node, options, event);
    }

    //delegate showing to plugins
    for(i in options) {
      fx = S.fx[i];
      if(fx && fx.show) fx.show(ext, node, options, event);
    }
  },

  //whether popup is showing
  isShowing = function(ext) {
    return !!showing[byId(ext).id];
  },

  //gets the closest ancestor node which is a popup, or null
  findParentPopup = function(n) {
    if(!n.nodeType) n = n.target || n.srcElement;
 
    while(n && (n = n.offsetParent) && n.nodeType == 1) {
      if(showing[n.id]) return n;
    }
  },

  //hide a popup
  hide = function(ext, event) {
    var options, i, fx, node;

    //hide can be called on any child node as a programmatic convenience
    //so we need to walk up the parent tree until we find the popup node
    while(ext && ext.nodeType == 1) {
      if(options = showing[ext.id]) {
        node = byId(options.nodeID);

        //make sure to call "hide" on all the plugins
        for(i in options) {
          fx = S.fx[i];
          if(fx && fx.hide) fx.hide(ext, node, options, event);
        }

        delete showing[options.extID];
        break;
      }
      ext = ext.parentNode;
    }
  },

  //These are plugins that we delegate all tasks too. We recognize 4
  //methods on the plugins that are called in sequence. Each method is 
  //called on all plugins before the 2nd method is called.
  //  "adjust" is called 1st that can do anything including 
  //          manipulating the options object
  //  "position" is called 2nd that can move the popup box anywhere
  //  "show" is called 3rd that manipulates CSS to show the node
  //  "hide" is called 4th when the popup is being hidden
  fx = {

    //this plugin is injected in all popups by calling it inside "signr.defs"
    //to use your custom animation, set anim=0
    anim: {
      hide: function(ext, node, options) {
        if(options.anim == 1) ext.style.display = "none";
      }
    },

    //this plugin positions a popup visually inside another node but
    //not physically inside it. It can be made to dock against any 
    //corner, edge or be dead centered. The "options" can contain an
    //optional padding (i.e., "pad=3,4" means x+=3, y+=4)
    //To set the position do "inside=tl" where "tl" is as below.
    inside: {
      position: function(ext, node, options) {

        ext = ext || doc.body;
        if(ext == doc.body) ext.style.position = "static";

        var x, y, scroll,
          corner = options.inside || "c",
          side = corner.charAt(0),
          pad = options.pad ? options.pad.split(",") : [0,0],
          node = pos(node),
          box = pos(ext);

        pad = {x:pad[0], y:pad[1]};

        //to make up for position=static on IE6 but makes no attempt
        //to maintain it on page scroll
        if(ie6 && ext == doc.body) {
          scroll = scrolled();
          node.x = scroll.x;
          node.y = scroll.y;
        }

        if(side == "c") {  //center
          y = node.y + node.h/2 - box.h/2;
          x = node.x + node.w/2 - box.w/2;

        } else if(side == "t") {  //top
          y = node.y + pad.y;
          x = (corner == "tl") ? node.x + pad.x:
              (corner == "tr") ? node.x + node.w - box.w - pad.x:
              node.x + node.w/2 - box.w/2;

        } else if(side == "r") {  //right
          x = node.x + node.w - box.w - pad.x;
          y = node.y + node.h/2 - box.h/2;

        } else if(side == "b") {  //bottom
          y = node.y + node.h - box.h - pad.y;
          x = (corner == "bl") ? node.x + pad.x:
              (corner == "br") ? node.x + node.w - box.w - pad.x:
              node.x + node.w/2 - box.w/2;

        } else if(side == "l") {  //left
          x = node.x + pad.x;
          y = node.y + node.h/2 - box.h/2;
        }

        css(ext, {
          left: x + px,
          top: y + px
        });
      }
    },

    //this plugin positions a popup adjacent to a node touching on any
    //one edge and aligned on one further axis. The "options" can contain
    //an optional padding (i.e., "pad=3,4" means x+=3, y+=4)
    //To set the position do "around=tl" where "tl" is as below.
    around: {
      position: function(ext, node, options) {
        var x, y,
          corner = options.around || "bl",
          side = corner.charAt(0),
          pad = options.pad ? options.pad.split(",") : [0,0],
          node = pos(node),
          box = pos(ext);

        pad = {x:pad[0], y:pad[1]};

        if(side == "t") {  //top
          y = node.y - box.h - pad.y;
          x = (corner == "tl") ? node.x :
              (corner == "tr") ? node.x + node.w - box.w :
              (corner == "tc") ? node.x + node.w/2 - box.w/2 : -3;

        } else if(side == "r") {  //right
          x = node.x + node.w + pad.x;
          y = (corner == "rt") ? node.y :
              (corner == "rb") ? node.y + node.h - box.h :
              (corner == "rc") ? node.y + node.h/2 - box.h/2 : -3;

        } else if(side == "b") {  //bottom
          y = node.y + node.h + pad.y;
          x = (corner == "bl") ? node.x :
              (corner == "br") ? node.x + node.w - box.w :
              (corner == "bc") ? node.x + node.w/2 - box.w/2 : -3;

        } else if(side == "l") {  //left
          x = node.x - box.w - pad.x;
          y = (corner == "lt") ? node.y :
              (corner == "lb") ? node.y + node.h - box.h :
              (corner == "lc") ? node.y + node.h/2 - box.h/2 : -3;
        }

        css(ext, {
          left: x + px,
          top: y + px
        });
      }
    },

    shadow: {
      show: ie8 ? function(ext, node, options, pad) {
        var 
          blur = "Blur(pixelradius=3,makeshadow='true',shadowOpacity=0.3);",
          n = make('<div class="signr-ie8shadow" style="-ms-' + 
              S.progid + blur +
              S.progid + blur + 
              'background:#000"></div>');

        options.shadowID = ensureHasID(n);

        if(pad = options.pad) {
          pad = pad.split(",");
          pad = {x:pad[0], y:pad[1], w:pad[2], h:pad[3]};
        }

        insBefore(n, ext);
        cover(n, ext, pad || this._pad);
      } : function(ext) {
        addClass(ext, "signr-shadow");
      },

      hide: ie8 ? function(ext, node, options) {
        remove(options.shadowID);
      } : 0,

      _pad: {
        x:3, y:3, w:1, h:1
      }
    },

    ie6shim: {
      show: function(ext, node, options, n, s) {
        n = make("<iframe class='signr-ie6shim' style='filter:alpha(opacity=1)'" +
            " security=restricted scrolling=no frameborder=0 src='javascript:\"<html><\/html>\";'></iframe>");
        options.ie6shimID = ensureHasID(n);
        insBefore(n, ext);
        cover(n, ext);
      },

      hide: function(ext, node, options) {
        remove(options.ie6shimID);
      }
    }
  },

  //export object
  S = {
    ie8: ie8,
    ie7: ie7,
    ie6: ie6,
    progid: progid,
    uniq: 9,

    mixin: mixin,
    byId: byId,
    insBefore: insBefore,
    remove: remove,
    attr: attr,
    css: css,
    addClass: addClass,
    make: make,
    onEvent: onEvent,
    unEvent: unEvent,

    scrolled: scrolled,
    pos: pos,
    cover: cover,

    ensureHasID: ensureHasID,

    showing: showing,
    show: show,
    isShowing: isShowing,
    findParentPopup: findParentPopup,
    hide: hide,

    fx: fx,

    hints: {},

    //plugins listed here will execute for all popups
    defs: {anim:1, shadow:1}
  };

if(ie6) S.defs.ie6shim = 1;

insBefore(
  make("<style>.signr-shadow{box-shadow:1px 1px 7px rgba(0,0,0,0.5)}.signr-hide{display:none}<\/style>"),
  doc.getElementsByTagName("script")[0]
);

return S;

}(this, document);
