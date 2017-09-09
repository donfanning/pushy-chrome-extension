/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
(function() {
  'use strict';

  /**
   * The background script for the extension.<br>
   * Note: We can't be an Event Page because we use
   * the chrome.webRequest API
   * @namespace app.Background
   */
  new ExceptionHandler();

  /**
   * Initial {@link ClipItem}
   * @type {string}
   * @default
   * @const
   * @private
   * @memberOf app.Background
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
   * Event: Fired when the extension is first installed,<br />
   * when the extension is updated to a new version,<br />
   * and when Chrome is updated to a new version.
   * @see https://developer.chrome.com/extensions/runtime#event-onInstalled
   * @param {Object} details - type of event
   * @private
   * @memberOf app.Background
   */
  function _onInstalled(details) {
    if (details.reason === 'install') {
      // extension installed
      Chrome.GA.event(Chrome.GA.EVENT.INSTALLED);
      // save OS
      Chrome.Utils.getPlatformOS().then((os) => {
        Chrome.Storage.set('os', os);
        return null;
      }).catch((err) => {
        Chrome.GA.error(err.message, 'Background._onInstalled');
      });
      _initializeData();
      app.Utils.showMainTab();
    } else if (details.reason === 'update') {
      _updateData();
      _initializeFirebase().then(() => {
        return app.SW.update();
      }).catch((err) => {
        Chrome.GA.error(err.message, 'Background._onInstalled');
      });
    }
    app.Utils.setBadgeText();
    app.Alarm.updateAlarms();
    app.Permissions.injectContentScripts();
  }

  /**
   * Event: Fired when a profile that has this extension installed first
   * starts up
   * @see https://developer.chrome.com/extensions/runtime#event-onStartup
   * @private
   * @memberOf app.Background
   */
  function _onStartup() {
    Chrome.GA.page('/background.html');
    app.Alarm.updateAlarms();
    app.Alarm.deleteOldClipItems();
    _initializeFirebase().catch((err) => {
      Chrome.GA.error(err.message, 'Background._onStartup');
    });
    app.Utils.setBadgeText();
  }

  /**
   * Event: Fired when a browser action icon is clicked.
   * @see https://goo.gl/abVwKu
   * @private
   * @memberOf app.Background
   */
  function _onIconClicked() {
    // get the clipboard contents
    const text = app.CB.getTextFromClipboard();
    if (Chrome.Utils.isWhiteSpace(text)) {
      return;
    }

    // Persist
    let addOK = false;
    app.ClipItem.add(text, Date.now(), false,
        false, app.Device.myName()).then((clipItem) => {
      addOK = true;
      return app.Msg.sendClipItem(clipItem);
    }).catch((err) => {
      if (addOK) {
        app.Msg.sendFailed(err);
      } else {
        Chrome.GA.error(err.message, 'Background._onIconClicked');
        app.Notify.create(app.Notify.TYPE.ERROR_STORE_CLIP, err.message);
      }
    });
  }

  /**
   * Event: Fired when a tab is updated.
   * @see https://developer.chrome.com/extensions/tabs#event-onUpdated
   * @param {int} tabId - id of tab
   * @private
   * @memberOf app.Background
   */
  function _onTabUpdated(tabId) {
    app.Permissions.injectContentScript(tabId);
  }

  /**
   * Event: Fired when item in localStorage changes
   * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
   * @param {Event} event - storage event
   * @param {string} event.key - storage item that changed
   * @private
   * @memberOf app.Background
   */
  function _onStorageChanged(event) {
    if ((event.key === 'allowPush') || (event.key === 'signedIn')) {
      app.Utils.setBadgeText();
    }
  }

  /**
   * Initialize the data saved in localStorage
   * @private
   * @memberOf app.Background
   */
  function _initializeData() {
    app.Data.saveDefaults();

    const introClip =
        new app.ClipItem(INTRO_TEXT, Date.now(), true,
            false, app.Device.myName());
    introClip.save().catch((err) => {
      Chrome.GA.error(err.message, 'Background._initializeData');
    });

    app.User.setInfo().catch((err) => {
      Chrome.GA.error(err.message, 'Background._initializeData');
    });
  }

  /**
   * Update the data saved in localStorage
   * @private
   * @memberOf app.Background
   */
  function _updateData() {
    // New items and removal of unused items can take place here
    // when the version changes
    const version = app.Data.getCurrentVersion();
    const oldVersion = Chrome.Storage.getInt('version');

    if (version > oldVersion) {
      // update version number
      Chrome.Storage.set('version', version);
    }

    if (oldVersion < 2) {
      // remove unused variables
      localStorage.removeItem('lastEmail');
      localStorage.removeItem('lastUid');
    }

    app.Data.saveDefaults();
  }

  /**
   * Initialize firebase and Service Worker if signed in
   * @returns {Promise<void>} void
   * @private
   * @memberOf app.Background
   */
  function _initializeFirebase() {
    if (app.Data.isSignedIn()) {
      return app.SW.initialize().catch((err) => {
        Chrome.GA.error(err.message, 'Background._initializeFirebase');
      });
    } else {
      return Promise.resolve();
    }
  }

  // Listen for extension install or update
  chrome.runtime.onInstalled.addListener(_onInstalled);

  // Listen for Chrome starting
  chrome.runtime.onStartup.addListener(_onStartup);

  // Listen for click on the icon
  chrome.browserAction.onClicked.addListener(_onIconClicked);

  // Listen for tab updates
  chrome.tabs.onUpdated.addListener(_onTabUpdated);

  // Listen for changes to localStorage
  addEventListener('storage', _onStorageChanged, false);
})();
