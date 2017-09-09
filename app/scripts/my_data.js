/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * The extension's localStorage data
 * @namespace
 */
app.Data = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Version of data - update when items are added, removed, changed
   * @type {int}
   * @default
   * @const
   * @private
   * @memberOf app.Data
   */
  const _VERSION = 2;

  /**
   * The data items saved to localStorage
   *
   * @typedef {Object} app.Data.Items
   * @property {int} version - version of data
   * @property {boolean} monitorClipboard - save clipboard contents
   * @property {boolean} allowPush - send push notifications
   * @property {boolean} autoSend - automatically send push notifications
   * @property {boolean} allowReceive - receive push notifications
   * @property {int} storageDuration - how long to save clipItems
   * @property {boolean} notify - xxx
   * @property {boolean} notifyOnSend - show notification on send push
   * @property {boolean} notifyOnReceive - show notification on receive push
   * @property {boolean} highPriority - send high priority messages
   * @property {string} deviceSN - serial number of our device
   * @property {string} deviceNickname - nickname of our device
   * @property {Object} devices - other devices we know about
   * @property {boolean} signedIn - are we logged in
   * @property {boolean} registered - are we registered with server
   * @property {boolean} needsCleanup - does are log in state need cleanup
   * @property {string} email - our email address
   * @property {string} uid - our unique id
   * @property {string} photoURL - path to out photo url
   * @property {string} permissions - enum: notSet allowed denied
   * @memberOf app.Data
   */

  /**
   * Default values for localStorage items
   * @type {app.Data.Items}
   * @const
   * @private
   * @memberOf app.Data
   */
  const _DEFAULTS = {
    'version': _VERSION,
    'monitorClipboard': true,
    'allowPush': true,
    'autoSend': true,
    'allowReceive': true,
    'storageDuration': 2,
    'notify': true,
    'notifyOnSend': false,
    'notifyOnReceive': true,
    'highPriority': true,
    'deviceNickname': '',
    'devices': {},
    'signedIn': false,
    'registered': false,
    'needsCleanup': false,
    'email': '',
    'uid': '',
    'photoURL': '',
    'permissions': 'notSet', // enum: notSet allowed denied
  };

  return {
    /**
     * Get the current data version
     * @returns {int} the version of our data
     * @memberOf app.Data
     */
    getCurrentVersion: function() {
      return _VERSION;
    },

    /**
     * Save the [_DEFAULTS]{@link app.Data._DEFAULTS}, if they
     * do not already exist
     * @memberOf app.Data
     */
    saveDefaults: function() {
      Object.keys(_DEFAULTS).forEach(function(key) {
        if (Chrome.Storage.get(key) === null) {
          Chrome.Storage.set(key, _DEFAULTS[key]);
        }
      });
      // and the autogenerated serial number
      if (Chrome.Storage.get('deviceSN') === null) {
        Chrome.Storage.set('deviceSN', Chrome.Utils.randomString(8));
      }
    },

    /**
     * Are we saving clipboard contents
     * @returns {boolean} true if enabled
     * @memberOf app.Data
     */
    isMonitorClipboard: function() {
      return Chrome.Storage.getBool('monitorClipboard');
    },

    /**
     * Has user enabled pushing to {@link app.Devices}
     * @returns {boolean} true if enabled
     * @memberOf app.Data
     */
    allowPush: function() {
      return Chrome.Storage.getBool('allowPush');
    },

    /**
     * Has user enabled autoSend option
     * @returns {boolean} true if enabled
     * @memberOf app.Data
     */
    isAutoSend: function() {
      return Chrome.Storage.getBool('autoSend');
    },

    /**
     * Has user enabled receiving from {@link app.Devices}
     * @returns {boolean} true if enabled
     * @memberOf app.Data
     */
    allowReceive: function() {
      return Chrome.Storage.getBool('allowReceive');
    },

    /**
     * Are we signed in
     * @returns {boolean} true if signed in
     * @memberOf app.Data
     */
    isSignedIn: function() {
      return Chrome.Storage.getBool('signedIn');
    },

    /**
     * Are we registered with fcm
     * @returns {boolean} true if registered
     * @memberOf app.Data
     */
    isRegistered: function() {
      return Chrome.Storage.getBool('registered');
    },

    /**
     * Are we not registered with fcm
     * @returns {boolean} true if not registered
     * @memberOf app.Data
     */
    notRegistered: function() {
      return !this.isRegistered();
    },

    /**
     * Get our serial number
     * @returns {boolean} true if not registered
     * @memberOf app.Data
     */
    getDeviceSN: function() {
      return Chrome.Storage.get('deviceSN');
    },
  };
})();
