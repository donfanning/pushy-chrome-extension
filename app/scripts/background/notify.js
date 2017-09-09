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
   * @property {string} id - unique notification id
   * @property {string} title - title
   * @property {string} message - message
   * @property {string} icon - path to icon
   * @property {boolean} isClickable - if true, execute function on click
   * @property {function} clickFunction - function to run on click
   * @property {boolean} requireInteraction - if true, visible until dismissed
   * @property {boolean} hasButtons - if true, we have buttons
   * @property {Array} buttons - button description
   * @property {Array} buttonFunctions - button click functions
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
      title: 'Pushy: Sent push message',
      message: 'Not set',
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: false,
      hasButtons: false,
      buttons: [],
      buttonFunctions: [],
    },
    ERROR_SEND: {
      id: 'error',
      title: 'Pushy: Failed to send message.',
      message: 'Not set',
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: true,
      hasButtons: true,
      buttons: [
        {
          'title': 'Contact support',
          'iconUrl': chrome.runtime.getURL('/images/ic_email_black_48dp.png'),
        },
      ],
      buttonFunctions: [_sendErrorEmail],
    },
    ERROR_STORE_CLIP: {
      id: 'error',
      title: 'Pushy: Failed to store clipboard contents',
      message: 'Not set',
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: true,
      hasButtons: true,
      buttons: [
        {
          'title': 'Contact support',
          'iconUrl': chrome.runtime.getURL('/images/ic_email_black_48dp.png'),
        },
      ],
      buttonFunctions: [_sendErrorEmail],
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
   * Get the Notification options object
   * @param {app.Notify.TYPE} type - notification type
   * @param {string} icon - path to icon
   * @param {string} message - message to display
   * @returns {Object} options object
   * @private
   */
  function _getOptions(type, icon, message) {
    let options = {
      type: 'basic',
      eventTime: Date.now(),
    };
    options.title = type.title;
    options.isClickable = type.isClickable;
    options.requireInteraction = type.requireInteraction;
    options.iconUrl = chrome.runtime.getURL(icon);
    options.message = message;
    if (type.hasButtons) {
      options.buttons = type.buttons;
    }
    return options;
  }

  /**
   * Send an email with info on an error
   * @param {app.Notify.TYPE} type - notification type
   * @private
   */
  function _sendErrorEmail(type) {
    const body = `${type.message}\n\n${app.Utils.getEmailBody()}` +
        'Please provide what information you can on what led to the error\n\n';
    const url = app.Utils.getEmailUrl(`Error: ${type.title}`, body);
    chrome.tabs.create({url: url});
  }

  /**
   * Event: Fired when the user clicked in a non-button area
   * of the notification.
   * @see https://developer.chrome.com/apps/notifications#event-onClicked
   * @param {string} id - notification type
   * @private
   * @memberOf app.Notify
   */
  function _onNotificationClicked(id) {
    for (let prop in TYPE) {
      if (TYPE.hasOwnProperty(prop)) {
        if (TYPE[prop].id === id) {
          // call click function
          if (TYPE[prop].clickFunction) {
            TYPE[prop].clickFunction();
            chrome.notifications.clear(id, () => {});
          }
          break;
        }
      }
    }
  }

  /**
   * Event: Fired when the user clicked on a button
   * of the notification.
   * @see https://developer.chrome.com/apps/notifications#event-onClicked
   * @param {string} id - notification type
   * @param {int} btnIdx - index of clicked button
   * @private
   * @memberOf app.Notify
   */
  function _onButtonClicked(id, btnIdx) {
    for (const prop in TYPE) {
      if (TYPE.hasOwnProperty(prop)) {
        const item = TYPE[prop];
        if (item.hasButtons && (item.id === id)) {
          // call button click function
          if (item.buttonFunctions[btnIdx]) {
            item.buttonFunctions[btnIdx](item);
            chrome.notifications.clear(id, () => {});
          }
          break;
        }
      }
    }
  }

  // Listen for click on our notifications
  chrome.notifications.onClicked.addListener(_onNotificationClicked);

  // Listen for click on our notification buttons
  chrome.notifications.onButtonClicked.addListener(_onButtonClicked);

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

      // save message
      type.message = message;

      // setup notification option object
      let options = _getOptions(type, icon, message);

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
