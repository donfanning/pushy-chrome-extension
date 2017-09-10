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
  const _VERSION = 3;

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
   * @property {boolean} notifyOnError - show notification on errors
   * @property {boolean} highPriority - send high priority messages
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
    'notifyOnError': true,
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

  /**
   * Initial {@link ClipItem}
   * @type {string}
   * @default
   * @const
   * @private
   * @memberOf Background
   */
  const INTRO_TEXT =
      `A clipboard manager with push notifications.

Please signin from the "Manage Account" page to share with your \
other devices.

You can click on the toolbar icon at any time to send the current \
contents of the clipboard to all your other devices.

Information you copy in most Chrome pages will \
automatically be sent if you have enabled that in "Settings".

You can display this page by right clicking on the toolbar icon and \
selecting "Options".

It is a good idea to go to the "Settings" page and enter a nickname \
for this device.`;

  /**
   * Save the [_DEFAULTS]{@link app.Data._DEFAULTS}, if they
   * do not already exist
   * @private
   * @memberOf app.Data
   */
  function _addDefaults() {
    Object.keys(_DEFAULTS).forEach(function(key) {
      if (Chrome.Storage.get(key) === null) {
        Chrome.Storage.set(key, _DEFAULTS[key]);
      }
    });
    // and the autogenerated serial number
    if (Chrome.Storage.get('deviceSN') === null) {
      Chrome.Storage.set('deviceSN', Chrome.Utils.getRandomString(8));
    }
  }

  return {
    /**
     * Initialize the data saved in localStorage
     * @memberOf app.Data
     */
    initialize: function() {
      _addDefaults();

      const introClip =
          new app.ClipItem(INTRO_TEXT, Date.now(), true,
              false, app.Device.myName());
      introClip.save().catch((err) => {
        Chrome.GA.error(err.message, 'app.Data.initialize');
      });

      app.User.setInfo().catch((err) => {
        Chrome.GA.error(err.message, 'app.Data.initialize');
      });
    },

    /**
     * Update the data saved in localStorage
     * @memberOf app.Data
     */
    update: function() {
      // New items and removal of unused items can take place here
      // when the version changes
      const oldVersion = Chrome.Storage.getInt('version');

      if ((oldVersion === null) || (_VERSION > oldVersion)) {
        // update version number
        Chrome.Storage.set('version', _VERSION);
      }

      if (oldVersion < 2) {
        // remove unused variables
        localStorage.removeItem('lastEmail');
        localStorage.removeItem('lastUid');
      }

      if (oldVersion < 3) {
        // remove unused variables
        localStorage.removeItem('notifyOnReceive');
      }

      _addDefaults();
    },
  };
})();
