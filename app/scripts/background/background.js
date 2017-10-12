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
   * @param {string} details.reason - reason for install
   * @param {string} details.previousVersion - old version if 'update' reason
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
        Chrome.Log.error(err.message, 'Background._onInstalled');
      });
      app.Data.initialize();
      app.Utils.showMainTab();
    } else if (details.reason === 'update') {
      // if (Chrome.Utils.getVersion() === details.previousVersion) {
      //   // spurious update: 
      //   // https://bugs.chromium.org/p/chromium/issues/detail?id=303481
      //   return;
      // }
      app.Data.update();
      _initializeFirebase().then(() => {
        return app.SW.update();
      }).catch((err) => {
        Chrome.Log.error(err.message, 'Background._onInstalled');
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
      Chrome.Log.error(err.message, 'Background._onStartup');
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
        const msg = err.message;
        if (msg !== app.ClipItem.ERROR_EMPTY_TEXT) {
          Chrome.Log.error(msg, 'Background._onIconClicked');
        }
        if (app.Notify.onError()) {
          app.Notify.create(app.Notify.TYPE.ERROR_STORE_CLIP, msg,
              new Chrome.Storage.LastError());
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
    if (!app.Utils.isSignedIn()) {
      return Promise.resolve();
    }

    return app.SW.initialize().then(() => {
      return app.SW.cantReceive();
    }).then((cantReceive) => {
      if (app.Utils.allowReceive() && cantReceive) {
        // can't receive messages anymore even though we want to.
        return app.User.forceSignOut(true, cantReceive);
      }
      return Promise.resolve();
    });
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
