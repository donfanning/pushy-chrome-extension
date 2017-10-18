/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage the extension's data sources
 * @namespace
 */
app.Data = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Version of data - update when items are added, removed, changed
   * @type {int}
   * @const
   * @private
   * @memberOf app.Data
   */
  const _VERSION = 6;

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
   * @property {boolean} notifyOnCopy - show notification when copy detected
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
   * @property {Chrome.Storage.LastError} lastError - last error that we saved
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
    'notifyOnCopy': false,
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
   * @const
   * @private
   * @memberOf app.Data
   */
  const _INTRO_TEXT =
      `A clipboard manager that can share with all your devices.
https://pushy-clipboard.github.io/index.html

Please signin from the "Manage Account" page to share with your \
other devices.

You can click on the toolbar icon at any time to send the current \
contents of the clipboard to all your other devices.

Information you copy in most Chrome pages will \
automatically be sent if you have enabled that in "Settings".

You can display this page by right clicking on the toolbar icon and \
selecting "Options".

It is a good idea to go to the "Settings" page and enter a nickname \
for this device.

Contact me for support or to provide feedback pushyclipboard@gmail.com

I write free, open source software for fun and hope it benefits others.
If you find the extension of value please rate it. Thanks. \

`;

  /**
   * Labeled {@link ClipItem}
   * @type {string}
   * @const
   * @private
   * @memberOf app.Data
   */
  const _EXAMPLE_LABEL = 'You can label items to categorize them.';

  /**
   * Labeled {@link ClipItem}
   * @type {string}
   * @const
   * @private
   * @memberOf app.Data
   */
  const _ERROR_INITIALIZE = 'Data initialization error.';

  /**
   * Save the [_DEFAULTS]{@link app.Data._DEFAULTS} if they don't exist
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

  /**
   * Add a {@link ClipItem} with a {@link Label}
   * @private
   * @memberOf app.Data
   */
  function _addLabelExample() {
    let label;
    app.Label.add('Example').then((lbl) => {
      label = lbl;
      return app.ClipItem.add(_EXAMPLE_LABEL, Date.now() - 1000, true, false,
          app.Device.myName());
    }).then((clipItem) => {
      return clipItem.addLabel(label);
    }).catch((err) => {
      Chrome.Log.error(err.message, 'app.Data.initialize', _ERROR_INITIALIZE);
    });
  }

  /**
   * Event: Fired when changes occur in the Dexie database
   * @see http://dexie.org/docs/Observable/Dexie.Observable.html
   * @param {Array} changes - database changes
   * @private
   * @memberOf app.Data
   */
  function _onDBChanged(changes) {
    let actionLabel;
    changes.forEach(function(change) {
      switch (change.type) {
        case 1: // CREATED
          actionLabel = `Created item in ${change.table}`;
          break;
        case 2: // UPDATED
          actionLabel = `Updated item in ${change.table}`;
          if (change.table === 'labels') {
            // update it in all the clips
            app.ClipItem.updateLabel(change.obj.name, change.oldObj.name);
          }
          break;
        case 3: // DELETED
          actionLabel = `Deleted item in ${change.table}`;
          if (change.table === 'labels') {
            // remove it from all the clips
            app.ClipItem.removeLabel(change.oldObj._id);
          }
          break;
        default:
          break;
      }
      Chrome.GA.event(app.GA.EVENT.DB_CHANGED, actionLabel);
    });
  }

  /**
   * Event: called when document and resources are loaded<br />
   * Listen for database changes
   * @private
   * @memberOf app.Data
   */
  function _onLoad() {
    // listen for changes to database
    app.DB.get().on('changes', _onDBChanged);
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  return {
    /**
     * Initialize the data saved in localStorage
     * @memberOf app.Data
     */
    initialize: function() {
      _addDefaults();

      _addLabelExample();

      const introClip =
          new app.ClipItem(_INTRO_TEXT, Date.now(), true,
              false, app.Device.myName());
      introClip.save().catch((err) => {
        Chrome.Log.error(err.message, 'app.Data.initialize', _ERROR_INITIALIZE);
      });

      app.User.setInfo().catch((err) => {
        Chrome.Log.error(err.message, 'app.Data.initialize', _ERROR_INITIALIZE);
      });

      // and the last error
      Chrome.Storage.clearLastError().catch((err) => {
        Chrome.Log.error(err.message, 'Data.initialize', _ERROR_INITIALIZE);
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

      if (Number.isNaN(oldVersion) || (_VERSION > oldVersion)) {
        // update version number
        Chrome.Storage.set('version', _VERSION);
      }

      if (!Number.isNaN(oldVersion)) {
        if (oldVersion < 2) {
          // remove unused variables
          localStorage.removeItem('lastEmail');
          localStorage.removeItem('lastUid');
        }

        if (oldVersion < 3) {
          // remove unused variables
          localStorage.removeItem('notifyOnReceive');
        }

        if (oldVersion < 5) {
          // move lastError
          const lastError = Chrome.Storage.get('lastError');
          if (lastError) {
            // transfer to chrome.storage.local
            Chrome.Storage.setLastError(lastError).catch((err) => {
              Chrome.Log.error(err.message, 'Data.update', _ERROR_INITIALIZE);
            });
            localStorage.removeItem('lastError');
          } else {
            // add empty
            Chrome.Storage.clearLastError().catch((err) => {
              Chrome.Log.error(err.message, 'Data.update', _ERROR_INITIALIZE);
            });
          }
        }

        if (oldVersion < 6) {
          _addLabelExample();
        }
      }

      _addDefaults();
    },
  };
})();
