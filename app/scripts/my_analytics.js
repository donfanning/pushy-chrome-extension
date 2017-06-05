/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://github.com/opus1269/chrome-extension-utils/blob/master/LICENSE.md
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
   * @property {Chrome.GA.Event} INSTALLED - extension installed
   * @property {Chrome.GA.Event} MENU - menu selected
   * @property {Chrome.GA.Event} TOGGLE - setting-toggle
   * @property {Chrome.GA.Event} LINK - setting-link
   * @property {Chrome.GA.Event} BUTTON - button click
   * @property {Chrome.GA.Event} SENT - message sent
   * @property {Chrome.GA.Event} RECEIVED - message received
   * @property {Chrome.GA.Event} REGISTERED - {@link Device} registered
   * @property {Chrome.GA.Event} UNREGISTERED - {@link Device} unregistered
   * @const
   * @memberOf app.GA
   */
  const EVENT = {
    INSTALLED: {
      eventCategory: 'extension',
      eventAction: 'installed',
      eventLabel: '',
    },
    MENU: {
      eventCategory: 'ui',
      eventAction: 'menuSelect',
      eventLabel: '',
    },
    TOGGLE: {
      eventCategory: 'ui',
      eventAction: 'toggle',
      eventLabel: '',
    },
    LINK: {
      eventCategory: 'ui',
      eventAction: 'linkSelect',
      eventLabel: '',
    },
    BUTTON: {
      eventCategory: 'ui',
      eventAction: 'buttonClicked',
      eventLabel: '',
    },
    ICON: {
      eventCategory: 'ui',
      eventAction: 'toolbarIconClicked',
      eventLabel: '',
    },
    SENT: {
      eventCategory: 'message',
      eventAction: 'sent',
      eventLabel: '',
      noInteraction: false,
    },
    RECEIVED: {
      eventCategory: 'message',
      eventAction: 'received',
      eventLabel: '',
      noInteraction: true,
    },
    REGISTERED: {
      eventCategory: 'register',
      eventAction: 'registered',
      eventLabel: '',
      noInteraction: false,
    },
    UNREGISTERED: {
      eventCategory: 'register',
      eventAction: 'unregistered',
      eventLabel: '',
      noInteraction: false,
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
