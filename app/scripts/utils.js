/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Misc. utility methods
 * @namespace
 */
app.Utils = (function() {
  'use strict';

  new ExceptionHandler();

  const MIN_IN_DAY = 60 * 24;

  const MILLIS_IN_DAY = MIN_IN_DAY * 60 * 1000;

  return {
    /**
     * Number of minutes in a day
     * @const
     * @type {int}
     * @memberOf app.Utils
     */
    MIN_IN_DAY: MIN_IN_DAY,

    /**
     * Number of milliseconds a in day
     * @const
     * @type {int}
     * @memberOf app.Utils
     */
    MILLIS_IN_DAY: MILLIS_IN_DAY,

    /**
     * Get our email address
     * @returns {string} email address
     * @memberOf app.Utils
     */
    getEmail: function() {
      return 'pushyclipboard@gmail.com';
    },

    /**
     * Get our Github base path
     * @returns {string} path
     * @memberOf app.Utils
     */
    getGithubPath: function() {
      return 'https://github.com/Pushy-Clipboard/pushy-chrome-extension/';
    },

    /**
     * Get our Github pages base path
     * @returns {string} path
     * @memberOf app.Utils
     */
    getGithubPagesPath: function() {
      return 'https://pushy-clipboard.github.io/';
    },

    /**
     * Get body for an email with basic extension info
     * @returns {string} text
     * @memberOf app.Utils
     */
    getEmailBody: function() {
      return `Extension version: ${Chrome.Utils.getVersion()}\n`
          + `Chrome version: ${Chrome.Utils.getFullChromeVersion()}\n`
          + `OS: ${Chrome.Storage.get('os')}\n\n\n`;
    },

    /**
     * Get encoded url for an email
     * @param {string} subject - email subject
     * @param {string} body - email body
     * @returns {string} encoded url
     * @memberOf app.Utils
     */
    getEmailUrl: function(subject, body) {
      const email = encodeURIComponent(app.Utils.getEmail());
      const sub = encodeURIComponent(subject);
      const bod = encodeURIComponent(body);
      return `mailto:${email}?subject=${sub}&body=${bod}`;
    },

    /**
     * Set the badge displayed on the extension icon
     * @memberOf app.Utils
     */
    setBadgeText: function() {
      let text = 'SAVE';
      if (app.Utils.isSignedIn() && app.Utils.allowPush()) {
        text = 'SEND';
      }
      chrome.browserAction.setBadgeText({text: text});
    },

    /**
     * Send message to the main tab to focus it. If not found, create it
     * @param {?string} [route='page-main'] - the page to route to
     * @memberOf app.Utils
     */
    showMainTab: function(route = 'page-main') {
      // send message to the main tab to focus it.
      const msg = Chrome.JSONUtils.shallowCopy(Chrome.Msg.HIGHLIGHT);
      msg.item = route;
      Chrome.Msg.send(msg).catch(() => {
        // no one listening, create it
        chrome.tabs.create({url: '../html/main.html'});
      });
    },

    /**
     * Get a date string in time ago format
     * @param {int} time - time since epoch in millis
     * @returns {string} Relative time format
     * @memberOf app.Utils
     */
    getRelativeTime: function(time) {
      return `${moment(time).fromNow()}, ` +
          `${moment(time).format('h:mm a')}`;
    },

    /**
     * Are we saving clipboard contents
     * @returns {boolean} true if enabled
     * @memberOf app.Utils
     */
    isMonitorClipboard: function() {
      return Chrome.Storage.getBool('monitorClipboard');
    },

    /**
     * Has user enabled pushing to {@link app.Devices}
     * @returns {boolean} true if enabled
     * @memberOf app.Utils
     */
    allowPush: function() {
      return Chrome.Storage.getBool('allowPush');
    },

    /**
     * Has user enabled autoSend option
     * @returns {boolean} true if enabled
     * @memberOf app.Utils
     */
    isAutoSend: function() {
      return Chrome.Storage.getBool('autoSend');
    },

    /**
     * Has user enabled receiving from {@link app.Devices}
     * @returns {boolean} true if enabled
     * @memberOf app.Utils
     */
    allowReceive: function() {
      return Chrome.Storage.getBool('allowReceive');
    },

    /**
     * Are we signed in
     * @returns {boolean} true if signed in
     * @memberOf app.Utils
     */
    isSignedIn: function() {
      return Chrome.Storage.getBool('signedIn');
    },

    /**
     * Are we registered with fcm
     * @returns {boolean} true if registered
     * @memberOf app.Utils
     */
    isRegistered: function() {
      return Chrome.Storage.getBool('registered');
    },

    /**
     * Are we not registered with fcm
     * @returns {boolean} true if not registered
     * @memberOf app.Utils
     */
    notRegistered: function() {
      return !this.isRegistered();
    },
  };
})();
