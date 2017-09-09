/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle display of notifications
 * @see https://developer.chrome.com/apps/notifications
 * @namespace
 */
app.Notify = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Notification type
   * @typedef {Object} app.Notify.TYPE
   * @property {string} id - unique notification type
   * @property {string} title - title
   * @property {string} icon - path to icon
   * @property {boolean} isClickable - if true, execute function on click
   * @property {function} clickFunction - function to run on click
   * @property {boolean} requireInteraction - if true, visible until dismissed
   * @memberOf app.Notify
   */

  /**
   * Event types
   * @type {{}}
   * @property {app.Notify.TYPE} SENT - message sent
   * @property {app.Notify.TYPE} SEND_ERROR - error sending message
   * @const
   * @memberOf app.Notify
   */
  const TYPE = {
    SENT: {
      id: 'sent',
      title: 'Sent push message',
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: false,
    },
    ERROR_SEND: {
      id: 'error',
      title: 'Failed to send push message',
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: true,
    },
  };

  /**
   * Icons
   * @type {{LOCAL_COPY: string,
   * ADD_DEVICE: string,
   * REMOVE_DEVICE: string,
   * ERROR: string}}
   * @const
   * @default
   * @private
   * @memberOf app.Notify
   */
  const ICON = {
    LOCAL_COPY: '/images/ic_local_copy.png',
    ADD_DEVICE: '/images/ic_add_device.png',
    REMOVE_DEVICE: '/images/ic_remove_device.png',
    ERROR: '/images/ic_error.png',
  };

  /**
   * Event: Fired when the user clicked in a non-button area
   * of the notification.
   * @see https://developer.chrome.com/apps/notifications#event-onClicked
   * @param {string} id - notification type
   * @private
   * @memberOf app.Notify
   */
  function _onNotificationClicked(id) {
    app.Utils.showMainTab();
    chrome.notifications.clear(id, () => {});
  }

  // Listen for click on our notifications
  chrome.notifications.onClicked.addListener(_onNotificationClicked);

  return {
    /**
     * notification types
     * @memberOf app.Notify
     */
    TYPE: TYPE,

    /**
     * notification icons
     * @memberOf app.Notify
     */
    ICON: ICON,

    /**
     * Create and display a notification
     * @param {app.Notify.TYPE} type - notification type
     * @param {?string} icon - path to icon
     * @param {string} message - message to display
     * @memberOf app.Notify
     */
    create: function(type, icon, message) {
      if (Chrome.Utils.isWhiteSpace(icon) ||
          Chrome.Utils.isWhiteSpace(message)) {
        // skip if no icon or message
        return;
      }

      // setup notification option object
      let options = {
        type: 'basic',
        eventTime: Date.now(),
      };
      options.title = type.title;
      options.isClickable = type.isClickable;
      options.requireInteraction = type.requireInteraction;
      options.iconUrl = chrome.runtime.getURL(icon);
      options.message = message;

      chrome.notifications.getPermissionLevel(function(level) {
        if (level === 'granted') {
          chrome.notifications.create(type.id, options, () => {});
        }
      });
    },

    /**
     * Determine if send notifications are enabled
     * @returns {boolean} true if enabled
     * @memberOf app.Notify
     */
    onSend: function() {
      const notify = Chrome.Storage.getBool('notify');
      const notifyOnSend = Chrome.Storage.getBool('notifyOnSend');
      return notify && notifyOnSend;
    },

    /**
     * Determine if error notifications are enabled
     * todo add UI entry and data entry
     * @returns {boolean} true if enabled
     * @memberOf app.Notify
     */
    onError: function() {
      const notify = Chrome.Storage.getBool('notify');
      const notifyOnError = Chrome.Storage.getBool('notifyOnError');
      return notify && notifyOnError;
    },
  };
})();
