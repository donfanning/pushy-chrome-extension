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

  const chromep = new ChromePromise();

  const _ERROR_NO_NOTIFICATIONS =
      'Display of notifications on received messages has been disabled.';

  /**
   * Notification type
   * @typedef {Object} app.Notify.TYPE
   * @property {string} id - unique notification id
   * @property {string} title - title
   * @property {string} message - message
   * @property {string} icon - path to icon
   * @property {boolean} isError - if true, error notification
   * @property {boolean} isClickable - if true, execute function on click
   * @property {function} clickFunction - function to run on click
   * @property {boolean} requireInteraction - if true, visible until dismissed
   * @property {boolean} hasButtons - if true, we have buttons
   * @property {Array} buttons - button description
   * @property {Array} buttonFunctions - button click functions
   * @memberOf app.Notify
   */

  /**
   * Notification types
   * @type {{}}
   * @property {app.Notify.TYPE} CLIPBOARD_CHANGED - detected clipboard change
   * @property {app.Notify.TYPE} MESSAGE_SENT - message sent to remote devices
   * @property {app.Notify.TYPE} DEVICE_ADDED - added our device
   * @property {app.Notify.TYPE} DEVICE_REMOVED - removed our device
   * @property {app.Notify.TYPE} SEND_ERROR - error sending message
   * @property {app.Notify.TYPE} ERROR_STORE_CLIP - error saving to DB
   * @const
   * @memberOf app.Notify
   */
  const TYPE = {
    CLIPBOARD_CHANGED: {
      id: 'localCopy',
      title: 'Clipboard change detected',
      message: 'Not set',
      icon: '/images/ic_local_copy.png',
      isError: false,
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: false,
      hasButtons: false,
      buttons: [],
      buttonFunctions: [],
    },
    MESSAGE_SENT: {
      id: 'localCopy',
      title: 'Sent push message',
      message: 'Not set',
      icon: '/images/ic_local_copy.png',
      isError: false,
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: false,
      hasButtons: false,
      buttons: [],
      buttonFunctions: [],
    },
    DEVICE_ADDED: {
      id: 'added',
      title: 'Sent push message',
      message: 'Not set',
      icon: '/images/ic_add_device.png',
      isError: false,
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: false,
      hasButtons: false,
      buttons: [],
      buttonFunctions: [],
    },
    DEVICE_REMOVED: {
      id: 'removed',
      title: 'Sent push message',
      message: 'Not set',
      icon: '/images/ic_remove_device.png',
      isError: false,
      isClickable: true,
      clickFunction: app.Utils.showMainTab,
      requireInteraction: false,
      hasButtons: false,
      buttons: [],
      buttonFunctions: [],
    },
    ERROR_SEND: {
      id: 'error_send',
      title: 'Failed to send message',
      message: 'Not set',
      icon: '/images/ic_error.png',
      isError: true,
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
      id: 'error_store_clip',
      title: 'Failed to store clipboard contents',
      message: 'Not set',
      icon: '/images/ic_error.png',
      isError: true,
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
    ERROR_FORCE_SIGN_OUT: {
      id: 'error_force_sign_out',
      title: 'Forced to sign out of extension',
      message: 'Not set',
      icon: '/images/ic_error.png',
      isError: true,
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
   * Get the Notification options object
   * @param {app.Notify.TYPE} type - notification type
   * @param {string} message - message to display
   * @returns {Object} options object
   * @private
   */
  function _getOptions(type, message) {
    let options = {
      type: 'basic',
      eventTime: Date.now(),
    };
    options.title = `Pushy: ${type.title}`;
    options.isClickable = type.isClickable;
    options.requireInteraction = type.requireInteraction;
    options.iconUrl = chrome.runtime.getURL(type.icon);
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
     * System Notifications not granted error message
     * @const
     * @type {string}
     * @memberOf app.Notify
     */
    ERROR_NO_NOTIFICATIONS: _ERROR_NO_NOTIFICATIONS,

    /**
     * Create and display a notification
     * @param {app.Notify.TYPE} type - notification type
     * @param {string} message - message to display
     * @param {Chrome.Storage.LastError} [lastError=null] - lastError
     * @memberOf app.Notify
     */
    create: function(type, message, lastError = null) {
      if (Chrome.Utils.isWhiteSpace(type.icon) ||
          Chrome.Utils.isWhiteSpace(message)) {
        // skip if no icon or message
        return;
      }

      // save message
      type.message = message;

      if (type.isError) {
        let error;
        if (lastError) {
          error = lastError;
          error.message = type.message;
          error.title = type.title;
        } else {
          error = new Chrome.Storage.LastError(type.message, type.title);
        }
        Chrome.Storage.setLastError(error);
        type.message += `\n\n${error.stack}`;
      }

      // setup notification option object
      let options = _getOptions(type, type.message);

      chromep.notifications.getPermissionLevel().then((level) => {
        if (level === 'granted') {
          return chromep.notifications.create(type.id, options);
        }
        return Promise.resolve();
      }).catch((err) => {
        Chrome.Log.error(err.message, 'Notify.create');
      });
    },

    /**
     * Determine if copy notifications are enabled
     * @returns {boolean} true if enabled
     * @memberOf app.Notify
     */
    onCopy: function() {
      const notify = Chrome.Storage.getBool('notify');
      return notify && Chrome.Storage.getBool('notifyOnCopy');
    },

    /**
     * Determine if send notifications are enabled
     * @returns {boolean} true if enabled
     * @memberOf app.Notify
     */
    onSend: function() {
      const notify = Chrome.Storage.getBool('notify');
      return notify && Chrome.Storage.getBool('notifyOnSend');
    },

    /**
     * Determine if error notifications are enabled
     * @returns {boolean} true if enabled
     * @memberOf app.Notify
     */
    onError: function() {
      const notify = Chrome.Storage.getBool('notify');
      return notify && Chrome.Storage.getBool('notifyOnError');
    },

    /**
     * Determine if navigator Notifications permission has been granted
     * Note: this will work from the background script of an extension,
     * unlike the other solutions
     * @see https://goo.gl/RzekrB
     * @see https://w3c.github.io/permissions/
     * @see https://www.chromestatus.com/features/6443143280984064
     * @returns {Promise<boolean>} true if granted
     * @memberOf app.Notify
     */
    hasNavigatorPermission: function() {
      return navigator.permissions.query({
        name: 'notifications',
      }).then((status) => {
        if (status.state === 'granted') {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });
    },
  };
})();
