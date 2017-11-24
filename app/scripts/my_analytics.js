/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage Google Analytics tracking
 * @namespace
 */
app.GA = (function() {
  'use strict';

  /**
   * Tracking ID
   * @type {string}
   * @const
   * @default
   * @private
   * @memberOf app.GA
   */
  const _TRACKING_ID = 'UA-61314754-3';

  /**
   * Event types
   * @type {{}}
   * @property {Chrome.GA.Event} CLICK - generic click
   * @property {Chrome.GA.Event} IMAGE_BUTTON - icon clicked (non-menu)
   * @property {Chrome.GA.Event} SENT - message sent
   * @property {Chrome.GA.Event} RECEIVED - message received
   * @property {Chrome.GA.Event} REGISTERED - {@link Device} registered
   * @property {Chrome.GA.Event} UNREGISTERED - {@link Device} unregistered
   * @property {Chrome.GA.Event} TOKEN_REFRESHED - firebase token refreshed
   * @property {Chrome.GA.Event} DB_CHANGED - any db change
   * @property {Chrome.GA.Event} CHROME_SIGN_OUT - Chrome signed out of our act.
   * @const
   * @memberOf app.GA
   */
  const EVENT = {
    CLICK: {
      eventCategory: 'ui',
      eventAction: 'click',
      eventLabel: '',
    },
    IMAGE_BUTTON: {
      eventCategory: 'ui',
      eventAction: 'imageButtonClicked',
      eventLabel: '',
    },
    SENT: {
      eventCategory: 'message',
      eventAction: 'sent',
      eventLabel: '',
    },
    RECEIVED: {
      eventCategory: 'message',
      eventAction: 'received',
      eventLabel: '',
    },
    REGISTERED: {
      eventCategory: 'register',
      eventAction: 'registered',
      eventLabel: '',
    },
    UNREGISTERED: {
      eventCategory: 'register',
      eventAction: 'unregistered',
      eventLabel: '',
    },
    TOKEN_REFRESHED: {
      eventCategory: 'token',
      eventAction: 'refreshed',
      eventLabel: '',
    },
    DB_CHANGED: {
      eventCategory: 'database',
      eventAction: 'changed',
      eventLabel: '',
    },
    CHROME_SIGN_OUT: {
      eventCategory: 'user',
      eventAction: 'chromeSignOut',
      eventLabel: '',
    },
  };

  /**
   * Event: called when document and resources are loaded<br />
   * Initialize Google Analytics
   * @private
   * @memberOf app.GA
   */
  function _onLoad() {
    // initialize analytics
    Chrome.GA.initialize(_TRACKING_ID, 'Pushy Clipboard',
        'pushy-chrome-extension', Chrome.Utils.getVersion());
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  return {
    EVENT: EVENT,
  };
})();
