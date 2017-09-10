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
   * @namespace Background
   */
  new ExceptionHandler();

  /**
   * Event: Fired when the extension is first installed,<br />
   * when the extension is updated to a new version,<br />
   * and when Chrome is updated to a new version.
   * @see https://developer.chrome.com/extensions/runtime#event-onInstalled
   * @param {Object} details - type of event
   * @private
   * @memberOf Background
   */
  function _onInstalled(details) {
    if (details.reason === 'install') {
      // extension installed
      Chrome.GA.event(Chrome.GA.EVENT.INSTALLED);
      // save OS
      Chrome.Utils.getPlatformOS().then((os) => {
        Chrome.Storage.set('os', os);
        return Promise.resolve();
      }).catch((err) => {
        Chrome.GA.error(err.message, 'Background._onInstalled');
      });
      app.Data.initialize();
      app.Utils.showMainTab();
    } else if (details.reason === 'update') {
      app.Data.update();
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
   * @memberOf Background
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
   * @memberOf Background
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
        if (app.Notify.onError()) {
          app.Notify.create(app.Notify.TYPE.ERROR_STORE_CLIP, err.message);
        }
      }
    });
  }

  /**
   * Event: Fired when a tab is updated.
   * @see https://developer.chrome.com/extensions/tabs#event-onUpdated
   * @param {int} tabId - id of tab
   * @private
   * @memberOf Background
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
   * @memberOf Background
   */
  function _onStorageChanged(event) {
    if ((event.key === 'allowPush') || (event.key === 'signedIn')) {
      app.Utils.setBadgeText();
    }
  }

  /**
   * Initialize firebase and Service Worker if signed in
   * @returns {Promise<void>} void
   * @private
   * @memberOf Background
   */
  function _initializeFirebase() {
    if (app.Utils.isSignedIn()) {
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
