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
     * @memberOf app.Utils
     * @returns {string} email address
     */
    getEmail: function() {
      return 'pushyclipboard@gmail.com';
    },

    /**
     * Get our Github base path
     * @memberOf app.Utils
     * @returns {string} path
     */
    getGithubPath: function() {
      return 'https://github.com/Pushy-Clipboard/pushy-chrome-extension/';
    },

    /**
     * Get our Github pages base path
     * @memberOf app.Utils
     * @returns {string} path
     */
    getGithubPagesPath: function() {
      return 'https://pushy-clipboard.github.io/';
    },

    /**
     * Get body for an email with basic extension info
     * @memberOf app.Utils
     * @returns {string} text
     */
    getEmailBody: function() {
      return `Extension version: ${Chrome.Utils.getVersion()}\n`
          + `Chrome version: ${Chrome.Utils.getFullChromeVersion()}\n`
          + `OS: ${Chrome.Storage.get('os')}\n\n\n`;
    },

    /**
     * Get encoded url for an email
     * @memberOf app.Utils
     * @param {string} subject - email subject
     * @param {string} body - email bosy
     * @returns {string} encoded url
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
      let text = '';
      if (app.MyData.isSignedIn() && app.MyData.allowPush()) {
        text = 'SEND';
      }
      chrome.browserAction.setBadgeText({text: text});
    },

    /**
     * Send message to the main tab to focus it. If not found, create it
     * @memberOf app.Utils
     */
    showMainTab: function() {
      // send message to the main tab to focus it.
      Chrome.Msg.send(app.ChromeMsg.HIGHLIGHT).catch(() => {
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
  };
})();
