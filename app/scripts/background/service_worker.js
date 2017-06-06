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
  const _ERR_NOT_REG = 'Not registered ';
  const _ERR_UNREG_BOOL = 'returned false';

  /**
   * Path to our {@link ServiceWorker}
   * @const
   * @default
   * @private
   * @memberOf app.SW
   */
  const SERVICE_WORKER = '../scripts/sw.js';

  /**
   * Our ServiceWorkerRegistration object
   * @private
   * @memberOf app.SW
   */
  let _swRegistration = null;

  /**
   * Register the Service Worker
   * Note: This can be called if already registered
   * @returns {Promise<Object>} service worker
   * @private
   * @memberOf app.SW
   */
  function _register() {
    return navigator.serviceWorker.register(SERVICE_WORKER).then((swReg) => {
      _swRegistration = swReg;
      return Promise.resolve(_swRegistration);
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
    return _swRegistration.pushManager.getSubscription().then((sub) => {
      if (sub) {
        return sub.unsubscribe();
      } else {
        throw new Error('Not subscribed');
      }
    });
  }

  return {
    /**
     * Initialize the {@link ServiceWorker} and firebase
     * @returns {Promise<void>} void
     * @memberOf app.SW
     */
    initialize: function() {
      if (_swRegistration) {
        return Promise.resolve();
      }

      return _register().then((swReg) => {
        return app.Fb.initialize(swReg);
      }).then(() => {
        return Promise.resolve();
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
      if (!_swRegistration) {
        throw new Error(_ERR_UNREG + _ERR_NOT_REG);
      }

      return _unsubscribePush().then(() => {
        return _swRegistration.unregister();
      }).then((unregistered) => {
        if (unregistered) {
          _swRegistration = null;
          return Promise.resolve();
        } else {
          throw new Error(_ERR_UNREG + _ERR_UNREG_BOOL);
        }
      }).catch((err) => {
        throw new Error(_ERR_UNREG + err.message);
      });
    },

    /**
     * Update the Service Worker
     * @returns {Promise<void>} void always resolves
     * @memberOf app.SW
     */
    update: function() {
      if (_swRegistration) {
        _swRegistration.update();
      }
      return Promise.resolve();
    },
  };
})();
