/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage lifecycle of our {@link ServiceWorker}
 * @namespace
 */
app.SW = (function() {
  'use strict';

  new ExceptionHandler();

  const _ERR_REG = 'Failed to register Service Worker: ';
  const _ERR_UNREG = 'Failed to unregister Service Worker: ';
  const _ERR_UNREG_BOOL = 'returned false';
  const _ERROR_NOT_SUBSCRIBED = 'Not subscribed to push notifications.';

  /**
   * Path to our {@link ServiceWorker}
   * @const
   * @private
   * @memberOf app.SW
   */
  const _PATH = '../scripts/sw.js';

  /**
   * Our ServiceWorkerRegistration object
   * @private
   * @memberOf app.SW
   */
  let _reg = null;

  /**
   * Register the Service Worker
   * Note: This can be called if already registered
   * @returns {Promise<Object>} service worker
   * @private
   * @memberOf app.SW
   */
  function _register() {
    return navigator.serviceWorker.register(_PATH).then((swReg) => {
      _reg = swReg;
      return Promise.resolve(_reg);
    }).catch((err) => {
      throw new Error(_ERR_REG + err.message);
    });
  }

  /**
   * Unsubscribe from push notifications
   * @returns {Promise<void>} void
   * @private
   * @memberOf app.SW
   */
  function _unsubscribePush() {
    return _reg.pushManager.getSubscription().then((sub) => {
      if (sub) {
        return sub.unsubscribe();
      }
      return Promise.resolve();
    });
  }

  return {
    /**
     * Not subscribed to push error message
     * @const
     * @type {string}
     * @memberOf app.SW
     */
    ERROR_NOT_SUBSCRIBED: _ERROR_NOT_SUBSCRIBED,
    
    /**
     * Initialize the {@link ServiceWorker} and firebase
     * @returns {Promise<void>} void
     * @memberOf app.SW
     */
    initialize: function() {
      return _register().then((swReg) => {
        return app.Fb.initialize(swReg);
      }).catch((err) => {
        throw new Error(_ERR_REG + err.message);
      });
    },

    /**
     * Unregister the Service Worker
     * @returns {Promise<void>} void
     * @memberOf app.SW
     */
    unregister: function() {
      if (!_reg) {
        return Promise.resolve();
      }

      return _unsubscribePush().then(() => {
        return _reg.unregister();
      }).then((unregistered) => {
        if (unregistered) {
          _reg = null;
          return Promise.resolve();
        } else {
          return Promise.reject(new Error(_ERR_UNREG + _ERR_UNREG_BOOL));
        }
      }).catch((err) => {
        return Promise.reject(new Error(_ERR_UNREG + err.message));
      });
    },

    /**
     * Update the Service Worker
     * @returns {Promise<void>} void always resolves
     * @memberOf app.SW
     */
    update: function() {
      if (_reg) {
        _reg.update();
      }
      return Promise.resolve();
    },

    /**
     * Are we subscribed to push notifications
     * @returns {Promise<boolean>} true if subscribed
     * @memberOf app.SW
     */
    isSubscribed: function() {
      if (_reg) {
        return _reg.pushManager.getSubscription().then((sub) => {
          // sub null if not subscribed
          return Promise.resolve(!!sub);
        });
      }
      return Promise.resolve(false);
    },

    /**
     * Check if the ServiceWorker is not in a state for receiving messages
     * @returns {Promise<?string>} reason if it can't, or null
     * @memberOf app.SW
     */
    cantReceive: function() {
      // Need to be subscribed and have notifications permission
      let cantMsg = null;
      return app.Notify.hasNavigatorPermission().then((granted) => {
        if (!granted) {
          cantMsg = app.Notify.ERROR_NO_NOTIFICATIONS;
        }
        return app.SW.isSubscribed();
      }).then((subscribed) => {
        if (!subscribed) {
          cantMsg = app.SW.ERROR_NOT_SUBSCRIBED;
        }
        return Promise.resolve(cantMsg);
      });
    },
  };
})();
