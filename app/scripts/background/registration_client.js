/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle RegistrationEndpoint tasks on the gae server
 * @namespace
 */
app.Reg = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Base path of RegistrationEndpoint
   * @type string
   * @const
   * @private
   * @memberOf app.Reg
   */
  const URL_BASE = `${app.Gae.GAE_ROOT}/registration/v1/`;

  /**
   * Event: Fired when item in localStorage changes
   * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
   * @param {Event} event - storage event
   * @param {string} event.key - storage item that changed
   * @private
   * @memberOf app.Reg
   */
  function _onStorageChanged(event) {
    if (event.key === 'allowReceive') {
      const allowReceive = app.Utils.allowReceive();
      if (allowReceive) {
        // user wants to receive messages now
        app.Reg.register(true).catch((err) => {
          Chrome.GA.error(err.message, 'Reg._onStorageChanged');
          Chrome.Storage.set('allowReceive', !allowReceive);
          const msg = app.ChromeMsg.REGISTER_FAILED;
          msg.error = err.toString();
          // eslint-disable-next-line promise/no-nesting
          Chrome.Msg.send(msg).catch(() => {});
        });
      } else {
        // user no longer wants to receive messages
        app.Reg.unregister(true).catch((err) => {
          Chrome.GA.error(err.message, 'Reg._onStorageChanged');
          Chrome.Storage.set('allowReceive', !allowReceive);
          const msg = app.ChromeMsg.UNREGISTER_FAILED;
          msg.error = err.toString();
          // eslint-disable-next-line promise/no-nesting
          Chrome.Msg.send(msg).catch(() => {});
        });
      }
    }
  }

  /**
   * Listen for changes to localStorage
   */
  addEventListener('storage', _onStorageChanged, false);

  return {
    /**
     * Register {@link Device} with server
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise<void>} void
     * @memberOf app.Reg
     */
    register: function(interactive = false) {
      if (app.Utils.isRegistered() || !app.Utils.allowReceive()) {
        return Promise.resolve();
      }

      return app.Fb.getRegToken().then((regId) => {
        const url = `${URL_BASE}register/${regId}`;
        return app.Gae.doPost(url, true, interactive);
      }).then(() => {
        Chrome.GA.event(app.GA.EVENT.REGISTERED);
        Chrome.Storage.set('registered', true);
        return Promise.resolve();
      }).catch((err) => {
        Chrome.GA.error(err.message, 'Reg.register');
        const prefix = 'Failed to register with the server.\n';
        throw new Error(prefix + err.message);
      });
    },

    /**
     * Unregister {@link Device} with server
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise<void>} void
     * @memberOf app.Reg
     */
    unregister: function(interactive = false) {
      if (app.Utils.notRegistered()) {
        return Promise.resolve();
      }

      return app.Fb.getRegToken().then((regId) => {
        const url = `${URL_BASE}unregister/${regId}`;
        return app.Gae.doPost(url, true, interactive);
      }).then(() => {
        Chrome.GA.event(app.GA.EVENT.UNREGISTERED);
        Chrome.Storage.set('registered', false);
        return Promise.resolve();
      }).catch((err) => {
        Chrome.GA.error(err.message, 'Reg.unregister');
        const prefix = 'Failed to unregister with the server.\n';
        throw new Error(prefix + err.message);
      });
    },
  };
})();
