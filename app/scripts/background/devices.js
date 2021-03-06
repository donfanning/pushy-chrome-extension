/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * A list of remote {@link Device} objects we know about
 *  @namespace
 */
app.Devices = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * A Map of {@link Device} objects keyed by their unique names
   * @type {Map}
   * @private
   * @memberOf app.Devices
   */
  let _devices = new Map();

  /**
   * Convert Map to Object
   * @param {Map} map
   * @returns {Object} as Object
   * @private
   * @memberOf app.Devices
   */
  function _mapToObj(map) {
    let obj = Object.create(null);
    for (let [k, v] of map) {
      // We don’t escape the key '__proto__'
      // which can cause problems on older engines
      obj[k] = v;
    }
    return obj;
  }

  /**
   * Get the {@link Device} objects from localStorage
   * @private
   * @memberOf app.Devices
   */
  function _load() {
    _devices = new Map();
    const json = Chrome.Storage.get('devices');
    if (!json) {
      return;
    }
    for (let k in json) {
      if (json.hasOwnProperty(k)) {
        let v = json[k];
        let device =
            new app.Device(v.model, v.sn, v.os, v.nickname, v.lastSeen);
        _devices.set(k, device);
      }
    }
  }

  /**
   * Save the {@link Device} objects to localStorage
   * @private
   * @memberOf app.Devices
   */
  function _save() {
    Chrome.Storage.set('devices', _mapToObj(_devices));
    // let listeners know we changed
    Chrome.Msg.send(app.ChromeMsg.DEVICES_CHANGED).catch(() => {});
  }

  /**
   * Event: called when document and resources are loaded<br />
   * Load the {@link Device} objects from localStorage
   * @private
   * @memberOf app.Devices
   */
  function _onLoad() {
    _load();
  }

  // noinspection JSUnusedLocalSymbols
  /**
   * Event: Fired when a message is sent from either an extension process<br>
   * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
   * @see https://developer.chrome.com/extensions/runtime#event-onMessage
   * @param {Chrome.Msg.Message} request - details for the message
   * @param {Object} sender - MessageSender object
   * @param {function} response - function to call once after processing
   * @returns {boolean} true if asynchronous
   * @private
   * @memberOf app.Devices
   */
  function _onChromeMessage(request, sender, response) {
    let ret = false;

    if (request.message === app.ChromeMsg.REMOVE_DEVICE.message) {
      app.Devices.removeByName(request.item);
    } else if (request.message === app.ChromeMsg.PING.message) {
      app.Msg.sendPing().catch((err) => {
        app.Msg.sendFailed(err);
      });
    }
    return ret;
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  // listen for Chrome messages
  Chrome.Msg.listen(_onChromeMessage);

  return {
    /**
     * Get an {@link Iterator} on the Devices
     * @returns {Iterator.<Device>}
     * @memberOf app.Devices
     */
    entries: function() {
      return _devices.entries();
    },

    /**
     * Add a new {@link Device}
     * @param {Device} device
     * @memberOf app.Devices
     */
    add: function(device) {
      _devices.set(device.getUniqueName(), device);
      _save();
    },

    /**
     * Remove a {@link Device}
     * @param {Device} device
     * @memberOf app.Devices
     */
    remove: function(device) {
      this.removeByName(device.getUniqueName());
    },

    /**
     * Remove a {@link Device} with the given unique name
     * @param {string} uniqueName
     * @memberOf app.Devices
     */
    removeByName: function(uniqueName) {
      _devices.delete(uniqueName);
      _save();
    },

    /**
     * Remove all {@link Device} objects
     * @memberOf app.Devices
     */
    clear: function() {
      _devices.clear();
      _save();
    },
  };
})();
