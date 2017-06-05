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
   * @property {app.CGA.Event} INSTALLED - extension installed
   * @property {app.CGA.Event} MENU - menu selected
   * @property {app.CGA.Event} TOGGLE - setting-toggle
   * @property {app.CGA.Event} LINK - setting-link
   * @property {app.CGA.Event} BUTTON - button click
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
    app.CGA.initialize(_TRACKING_ID, 'Pushy Clipboard',
        'pushy-chrome-extension', app.CUtils.getVersion());
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  return {
    EVENT: EVENT,
  };
})();
