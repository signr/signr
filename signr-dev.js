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
  //constants
  addEvent = !!doc.addEventListener,  //true if supported
  ie8 = win.ActiveXObject && !addEvent,  //ie8 and under
  ie7 = ie8 && !doc.querySelector,  //ie7 and under
  ie6 = ie7 && !win.XMLHttpRequest,  //ie6

  progid = undefined || "filter:progid:DXImageTransform.Microsoft.",  //for IE filter
  px = undefined || "px",
  className = undefined || "className",

  //copies all properties from Origin to Target
  mixin = function(t, o) {
    for(var i in o) t[i] = o[i];
    return t;
  },

  /****************** DOM ******************/

  //shortcut for "getElementById" with detection if param is already a node
  byId = function(s) {
    return s && s.charAt ? doc.getElementById(s) : s;
  },

  //shortcut for "insertBefore", 3rd param is a toggle for insertAfter.
  insBefore = function(n, ref, after) {
    return ref.parentNode.insertBefore(n, after ? ref.nextSibling : ref);
  },

  //shortcut for "removeChild"
  remove = function(n) {
    n = byId(n);
    if(n) n.parentNode.removeChild(n);
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

    if(style == "opacity") {
      if(value !== undefined) {
        n.style.filter = "alpha(opacity="+Math.round(value*100)+")";
      } else {
        n = (n.filters.alpha || {}).opacity;
      }
      return n < 2 ? n/100 : 1;
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
    n.innerHTML = str || "<div><\/div>";
    return n.firstChild;
  },

  /****************** Events ******************/

  //shortcut to "addEventListener"
  onEvent = addEvent ? function(n, type, fn, capture) {
    n.addEventListener(type, fn, !!capture);
  } : function(n, type, fn) {
    n.attachEvent("on" + type, fn);
  },

  //shortcut to "removeEventListener"
  unEvent = addEvent ? function(n, type, fn, capture) {
    n.removeEventListener(type, fn, !!capture);
  } : function(n, type, fn) {
    n.detachEvent("on" + type, fn);
  },

  noEvent = function(e) {
    addEvent ? e.preventDefault() : e.returnValue = false;
  },

  /****************** Positioning ******************/

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
  pos = make().getBoundingClientRect ? function(n, scroll) {
    if(n == doc.body) return bodyPos();

    n = n.getBoundingClientRect();
    scroll = S.scrolled();
    return {
      x: n.left + scroll.x,
      y: n.top + scroll.y,
      w: n.right - n.left,
      h: n.bottom - n.top
    };
  } : function(n, n2, x, y) {
    if(n == doc.body) return bodyPos();

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

  //gets the size of the body node -> {x:0, y:0, w:0, h:0}
  bodyPos = function(n) {
    n = doc.documentElement;
    return {
      x: 0,
      y: 0,
      w: n.clientWidth,
      h: n.clientHeight
    }
  },

  //makes one node the same size and position as the 2nd node with
  //optional padding (pad = {x:0, y:0, h:0, w:0})
  cover = function(node, to, pad, isBody, cssPos) {
    cssPos = !ie6 && (to == doc.body || css(to, "position") == "fixed") ? "fixed" : "absolute";

    pad = mixin({x:0, y:0, w:0, h:0}, pad);
    to = pos(to);
    css(node, {
      left: (to.x - pad.x) + px,
      top: (to.y - pad.y) + px,
      width: (to.w + pad.w) + px,
      height: (to.h + pad.h) + px,
      position: cssPos
    });
  },

  /****************** Popup Methods ******************/

  //converts a comma separated list into a hash object
  csv2obj = function(str, obj) {
    obj = obj || {};
    if(str) str = str.replace(/([^,=]+)(?:=([^,]+))?/g, function(_, n, v) {
      obj[n] = isNaN(v) ? v : v*1;
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
    var obj, i, fx, extID, nodeID, nil = "null";

    //get options from various sources. We need to get the options
    //first because "ext" and "node" can be null and set by a plugin
    obj = mixin({}, S.defs);
    if(ext) {
      ext = byId(ext);
      extID = obj.extID = ensureHasID(ext);
      csv2obj(attr(ext, "data-signr"), obj);
    }
    if(node) {
      node = byId(node);
      nodeID = obj.nodeID = ensureHasID(node);
      csv2obj(attr(node, "data-signr"), obj);
    }
    options = csv2obj(options, obj);

    //mixin hints. Hints allow one option to expand into multiple options.
    //e.g., {speechbubble:1} -> {speechbubble:1, fadein:1, roundedge:1}
    for(i in options) {
      if(S.hints[i]) mixin(options, S.hints[i]);
    }

    //hereonafter we pass the call to the plugins. Each plugin can contain
    //4 functions which we call if they exist: "adopt, position, show, hide".

    //allow plugins to tweak the options before we do anything
    for(i in options) {
      if(options[i] != nil) {
        fx = S.fx[i];
        if(fx && fx.adopt) {
          if(fx.adopt(ext, node, options, event)) return;  //if returns "true" then abort
        }
      }
    }

    //"adopt" may give us new nodes, so re-get them
    ext = byId(options.extID);
    node = byId(options.nodeID);

    //hide it first if already showing
    if(showing[options.extID]) hide(ext.id);

    //persist the options until the popup is hidden
    showing[options.extID] = options;

    //must make the popup visible first so that offsetHeight can be 
    //read. Plugins can still animate the visibility of the popup 
    //later.
    css(ext, {
      display: "",
      position: !ie6 && css(ext, "position") == "fixed" ? "fixed" : "absolute"
    });
    delClass(ext, "signr-x");

    //position the popup
    for(i in options) {
      if(options[i] != nil) {
        fx = S.fx[i];
        if(fx && fx.position) fx.position(ext, node, options, event);
      }
    }

    //delegate showing to plugins
    for(i in options) {
      if(options[i] != nil) {
        fx = S.fx[i];
        if(fx && fx.show) fx.show(ext, node, options, event);
      }
    }
  },

  //whether popup is showing
  isShowing = function(ext) {
    return !!showing[byId(ext).id];
  },

  //gets the closest parent node which is a popup, or null
  findPopup = function(n) {
    if(!n.nodeType) n = n.target || n.srcElement;
 
    while(n && n.nodeType == 1) {
      if(showing[n.id]) return n;
      n = n.offsetParent;
    }
  },

  //hide a popup
  hide = function(ext, event) {
    var options, i, fx, node;
    ext = byId(ext);

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
      ext = ext.offsetParent;
    }
  },

  /****************** Plugins (in built) ******************/

  //These are plugins that we delegate all tasks too.
  //We recognize 4 methods on the plugins that are called in sequence.
  //Each method is called on all plugins before the 2nd method is called.
  //
  //  "adopt" is called 1st, that can do anything including 
  //          manipulating the options object. This can return "true"
  //          if you want to abort then popup.
  //  "position" is called 2nd that can move the popup box anywhere.
  //  "show" is called 3rd that manipulates CSS to show the node.
  //  "hide" is called 4th when the popup is being hidden.

  fx = {

    //Plugin: anim
    //Autoloading: yes
    //Action: hides the popup
    //Params: set anim=0 to use your own animation plugin
    anim: {
      hide: function(ext, node, options) {
        if(options.anim == 1) ext.style.display = "none";
      }
    },

    //Plugin: inside
    //Action: positions the popup visually inside another node; docked or centered.
    //Params: set inside=X where X is one of: tl,tr,tc,r,bl,br,bc,l,c
    //Params: set pad=X,Y or pad=X where X|Y are integers
    inside: {
      position: function(ext, node, options) {
        node = node || doc.body;

        var x, y, scroll,
          isBody = (node == doc.body),
          corner = options.inside || "c",
          side = corner.charAt(0),
          pad = options.pad || 0,
          node = pos(node),
          box = pos(ext);

        pad = pad >= 0 ? [pad, pad] : pad.split(",");
        pad = {x:pad[0]*1, y:(pad[1] || pad[0])*1};

        if(isBody) {
          if(ie6) {
            //to make up for position=fixed on IE6 but makes no attempt
            //to maintain it on page scroll
            scroll = scrolled();
            node.x = scroll.x;
            node.y = scroll.y;
          } else {
            ext.style.position = "fixed";
          }
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

    //Plugin: around
    //Action: positions the popup next to another node touching on an edge.
    //Params: set around=X where X is one of: tl,tr,tc,rt,rb,rc,bl,br,bc,lt,lb,lc
    //Params: set pad=X,Y or pad=X where X|Y are integers
    //Description: the popup touches the node on one edge and is aligned
    //one further axis.
    around: {
      position: function(ext, node, options) {
        var x, y,
          corner = options.around || "bl",
          side = corner.charAt(0),
          pad = options.pad || 0,
          node = pos(node),
          box = pos(ext);

        pad = pad >= 0 ? [pad, pad] : pad.split(",");
        pad = {x:pad[0]*1, y:(pad[1] || pad[0])*1};

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

    //Plugin: shadow
    //Autoloading: yes
    //Action: adds a shadow to the popup
    //Description: On IE it is done using additional nodes and IE filters
    shadow: {
      show: ie8 ? function(ext, node, options, pad) {
        var 
          blur = undefined || "Blur(pixelradius=3,makeshadow='true',shadowOpacity=0.3);",
          n = make('<div class="signr-ie8shadow" style="-ms-' + 
              progid + blur +
              progid + blur + 
              'background:#000"></div>');

        options.shadowID = ensureHasID(n);

        if(pad = options.shadowoffset) {
          pad = pad.split(",");
          pad = {x:pad[0]*1, y:pad[1]*1, w:pad[2]*1, h:pad[3]*1};
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

    //Plugin: anim
    //Autoloading: yes on ie6 only
    //Action: works around the windowed controls problem of selects always on top
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
    },

    //Plugin: anim
    //Action: dims the screen with semi-transparent div added to document body.
    //Params: add "white" option to make dim white, otherwise is black.
    //Params: set dim=X where X >= 0 && X <= 100, default is 30
    dim: {
      show: function(ext, node, options, n, white) {
        n = make();
        options.dimBoxID = ensureHasID(n);
        insBefore(n, ext);
        css(n, {
          opacity: options.dim/100 || 0.3,
          background: ("white" in options) ? "#fff" : "#000"
        });
        cover(n, "inside" in options ? node : doc.body);
      },

      hide: function(ext, node, options) {
        remove(options.dimBoxID);
      }
    }
  },

  /****************** Exports ******************/

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
    noEvent: noEvent,

    scrolled: scrolled,
    pos: pos,
    cover: cover,

    ensureHasID: ensureHasID,

    showing: showing,
    show: show,
    isShowing: isShowing,
    findPopup: findPopup,
    hide: hide,

    fx: fx,

    hints: {},

    //plugins listed here will execute for all popups
    defs: {anim:1, shadow:1}
  };

  /****************** CSS injection ******************/

//we inject CSS to allow support for these classes:
//  signr-x : add this to popups so they are hidden by default
//  signr-shadow : our shadow plugin uses this to create shadows
!function(n, t) {
  t = ".signr-x{display:none}.signr-shadow{-webkit-" + t + "-moz-" + t + t + "}";
  n.type = "text/css";
  insBefore(n, doc.getElementsByTagName("script")[0]);
  n.styleSheet ? n.styleSheet.cssText = t : n.innerHTML = t;
}(
  doc.createElement("style"),
  "box-shadow:1px 1px 7px rgba(0,0,0,0.5);"
);

//make the iframe shim default under IE6 only
if(ie6) S.defs.ie6shim = 1;

return S;

}(this, document);

/****************** Behavioral Plugins ******************/

//Plugin: toggle
//Action: plugin to toggle between showing/hiding a popup. The default
//  action for popups *without* this plugin is to hide the popup and then
//  immediately show it again. This plugin will cause it to hide when
//  invoked in succession.

signr.fx.toggle = {
  adopt: function(ext, node, o) {
    //returns false if popup hidden
    //returns true if popup showing which aborts current request
    o = signr.showing[ext.id];
    return o && (o.nodeID == node.id) && (signr.hide(ext) || 1);
  }
}

//Plugin: closeonblur
//Action: plugin to close popups upon focus elsewhere

!function(signr, doc, active, onEvent) {
"use strict";

active = {};

onEvent = function(e, ext, closable) {
  closable = signr.mixin({}, active);
  ext = e;

  while(ext && (ext = signr.findPopup(ext))) {
    closable[ext.id] = null;
    ext = signr.byId(signr.showing[ext.id].nodeID);  //nodeID can be null
  }

  for(ext in closable) if(ext = closable[ext]) signr.hide(ext.extID);
};

signr.onEvent(doc, "mousedown", onEvent);
signr.onEvent(doc, window.addEventListener ? "focus" : "focusin", onEvent, true);

signr.fx.closeonblur = {
  show: function(ext, node, options) {
    active[ext.id] = options;
  },
  hide: function(ext, node, options) {
    active[ext.id] = null;
  },
  evt: onEvent
};

}(signr, document);
