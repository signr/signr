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

!function(signr, doc) {
"use strict";

var  //shortcuts used by all
  fx = signr.fx,
  attr = signr.attr,
  byId = signr.byId,
  findPopup = signr.findPopup;

/****************** ignoreifopen ******************/
//Action: plugin to ignore a request if the popup is already open

fx.ignoreifopen = {
  n: 1,

  adopt: function(ext) {
    var extID = ext && ext.id,
      abort;
    if(!extID || extID == this.n) abort = 1;
    this.n = extID;
    return abort;
  },

  hide: function() {
    this.n = 1;
  }
};

/****************** toggle ******************/
//Action: plugin to toggle between showing/hiding a popup. The default
//  behavior for popups *without* this plugin is to hide the popup and then
//  immediately show it again. This plugin will cause it to hide and stay
//  hidden when invoked a 2nd time.

fx.toggle = {
  adopt: function(ext, node, o) {
    //returns false if popup hidden
    //returns true if popup showing which aborts current request
    o = signr.showing[ext.id];
    return o && (o.nodeID == node.id) && (signr.hide(ext) || 1);
  }
}

/****************** plugin maker ******************/
//this plugin maker returns a plugin that responds to specific events
//and if the event occurs outside a popup or outside the node that 
//invoked the popup, then the popup is hidden.

var _makeDeactivatorPlugin = function(events) {
  var
    target,
    timeout,
    active = {},

    handle = function(ext, closable, option, nodeID) {
      timeout = 0;

      //we start with a collection of active IDs and for every
      //id we encounter, we remove it from the collection. At 
      //the end we hide all the popups whose id is still in the
      //collection.
      closable = signr.mixin({}, active);

      ext = target;
      target = 0;  //clear memory

      while(ext) {
        if(option = closable[ext.id]) {
          nodeID = option.nodeID;

          delete closable[option.nodeID];
          delete closable[option.extID];

          nodeID = byId(option.nodeID);  //nodeID can be null
          //if the node is inside another popup, then trace through
          //that other popup too.
          if(nodeID) ext = findPopup(nodeID);

        } else ext = ext.parentNode;
      }

      //close all popups not removed from the collection
      for(ext in closable) signr.hide(closable[ext].extID);
    },

    onEvent = function(e, i) {
      for(i in active) {
        target = e.target || e.srcElement;
        if(!timeout) timeout = setTimeout(handle, 100);
        break;  //iterate only once if active is non-empty
      }
    };

  //listen to related events
  for(var str in events)
    signr.onEvent(doc, str, onEvent, !!events[str]);

  //return the plugin
  return {
    evt: onEvent,

    show: function(ext, node, options) {
      active[ext.id] = options;
      if(node) active[node.id] = options;
    },

    hide: function(ext, node) {
      delete active[ext.id];
      if(node) delete active[node.id];
    }
  };
}

/****************** closeonblur ******************/
//Action: plugin to close popups upon focus elsewhere

fx.closeonblur = _makeDeactivatorPlugin(
  window.addEventListener ? {focus:1, mousedown:0} : {focusin:0, mousedown:0}
);

/****************** closeonmouseout ******************/
//Action: plugin to close popups upon mouseout

fx.closeonmouseout = _makeDeactivatorPlugin({mouseover:0});

/****************** end of plugins ******************/
}(signr, document);
