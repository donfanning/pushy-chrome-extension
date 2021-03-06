/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage the current user
 * @namespace
 */
app.User = (function() {
  'use strict';

  new ExceptionHandler();

  const chromep = new ChromePromise();

  /**
   * Set signIn state
   * @param {boolean} val - true if signed in
   * @private
   */
  function _setSignIn(val) {
    Chrome.Storage.set('signedIn', val);
    // because Background._onStorageChanged won't be called
    app.Utils.setBadgeText();
    if (!val) {
      Chrome.Storage.set('photoURL', '');
    }
  }

  /**
   * Event: Fired when signin state changes for an act. on the user's profile.
   * @see https://developer.chrome.com/apps/identity#event-onSignInChanged
   * @param {Object} account - chrome AccountInfo
   * @param {boolean} signedIn - true if signedIn
   * @private
   * @memberOf app.User
   */
  function _onSignInChanged(account, signedIn) {
    const uid = Chrome.Storage.get('uid');
    if (app.Utils.isSignedIn() && !signedIn && (account.id === uid)) {
      // our user signed out of Chrome while we were signed in
      Chrome.GA.event(app.GA.EVENT.CHROME_SIGN_OUT);
      Chrome.Storage.set('needsCleanup', true);
      _setSignIn(false);
      app.Devices.clear();
      Chrome.Storage.set('registered', false);
      app.Fb.signOut().catch(() => {});
    }
    app.User.setInfo().catch((err) => {
      Chrome.Log.error(err.message, 'User._onSignInChanged');
    });
  }

  /**
   * Remove the cached auth token
   * @param {string[]|null} [scopes=null] - optional scopes to use, overrides
   * those in the manifest
   * @returns {Promise.<void>} void
   * @private
   */
  function _removeAuthToken(scopes = null) {
    return Chrome.Auth.removeCachedToken(false, null, scopes).catch((err) => {
      if (!scopes) {
        // should always have manifest token, but
        // the overridden ones are optional and may not exist
        // so just ignore the error removing them
        Chrome.Log.error(err.message, 'User._removeAuthToken');
      }
      // nice to remove but not critical
      return Promise.resolve();
    });
  }

  /**
   * Cleanup if user signed-out of Browser
   * @returns {Promise<void>} void
   * @private
   * @memberOf app.User
   */
  function _needsCleanup() {
    if (Chrome.Storage.getBool('needsCleanup')) {
      Chrome.Storage.set('needsCleanup', false);
      return _removeAuthToken();
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Sign in and register our {@link Device}
   * @returns {Promise<void>} void
   * @private
   * @memberOf app.User
   */
  function _signIn() {
    return _needsCleanup().then(() => {
      return app.SW.initialize();
    }).then(() => {
      return Chrome.Auth.getToken(true);
    }).then((token) => {
      return app.Fb.signIn(token);
    }).then((user) => {
      _setSignIn(true);
      if (!Chrome.Utils.isWhiteSpace(user.photoURL)) {
        Chrome.Storage.set('photoURL', user.photoURL);
      }
      return app.Reg.register(true);
    }).then(() => {
      return app.Msg.sendDeviceAdded();
    });
  }

  /**
   * Unregister {@link Device} and sign out of firebase
   * @returns {Promise<void>} - always resolves
   * @private
   * @memberOf app.User
   */
  function _signOut() {
    return app.Msg.sendDeviceRemoved().then(() => {
      return app.Reg.unregister(true);
    }).then(() => {
      return app.Fb.signOut();
    }).then(() => {
      return _removeAuthToken();
    }).then(() => {
      // remove the Drive one too, if it exists
      return _removeAuthToken(app.Drive.SCOPES);
    }).then(() => {
      _setSignIn(false);
      app.Devices.clear();
      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message, 'User._signOut');
      // just force the sign out
      return app.User.forceSignOut(false, err.message);
    }).catch((err) => {
      Chrome.Storage.set('registered', false);
      _setSignIn(false);
      app.Devices.clear();
      Chrome.Log.error(err.message, 'User.forceSignOut');
      return Promise.resolve();
    });
  }

  // noinspection JSUnusedLocalSymbols
  /**
   * Event: Fired when a message is sent from either an extension process<br>
   * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
   * @see https://developer.chrome.com/extensions/runtime#event-onMessage
   * @param {Chrome.Msg.Message} request - details for the
   * @param {Object} sender - MessageSender object
   * @param {function} response - function to call once after processing
   * @returns {boolean} true if asynchronous
   * @private
   * @memberOf app.User
   */
  function _onChromeMessage(request, sender, response) {
    let ret = false;

    if (request.message === app.ChromeMsg.SIGN_IN.message) {
      // try to signIn a user
      ret = true; // async
      _signIn().then(() => {
        response({message: 'ok'});
        return Promise.resolve();
      }).catch((err) => {
        Chrome.Log.error(`${request.message}: ${err.message}`,
            'User._onChromeMessage');
        // eslint-disable-next-line promise/no-nesting
        _signOut().catch(() => {
          // always resolves
        });
        response({message: 'error', error: err.message});
      });
    } else if (request.message === app.ChromeMsg.SIGN_OUT.message) {
      // signOut a user - will always sign out
      ret = true; // async
      _signOut().then(() => {
        response({message: 'ok'});
        return Promise.resolve();
      }).catch(() => {
        // always resolves
        response({message: 'ok'});
      });
    } else if (request.message === app.ChromeMsg.FORCE_SIGN_OUT.message) {
      // force sign out
      ret = true; // async
      app.User.forceSignOut().then(() => {
        response({message: 'ok'});
        return Promise.resolve();
      }).catch(() => {
        _setSignIn(false);
        app.Devices.clear();
        response({message: 'ok'});
      });
    }
    return ret;
  }

  /**
   * Listen for changes to Browser sign-in
   */
  chrome.identity.onSignInChanged.addListener(_onSignInChanged);

  /**
   * Listen for Chrome messages
   */
  Chrome.Msg.listen(_onChromeMessage);

  return {
    /**
     * Persist info on current Browser user (may be no-one)
     * @returns {Promise<void>} void
     * @memberOf app.User
     */
    setInfo: function() {
      return chromep.identity.getProfileUserInfo().then((user) => {
        Chrome.Storage.set('email', user.email);
        Chrome.Storage.set('uid', user.id);
        return Promise.resolve();
      });
    },

    /**
     * Force signOut without unregistering from App Engine and without
     * needing OAuth
     * @param {boolean} [notify=false] if true, post error notification
     * @param {string} [reason='Unknown Error'] reason for call
     * @returns {Promise<void>} void
     * @memberOf app.User
     */
    forceSignOut: function(notify = false, reason = 'Unknown Error') {
      Chrome.Storage.set('registered', false);
      return app.Fb.signOut().then(() => {
        _setSignIn(false);
        app.Devices.clear();
        Chrome.Log.error(reason, 'User.forceSignOut');
        if (notify && app.Notify.onError()) {
          let msg = reason;
          msg += '\n\nTry to sign in again. If the problem persists, please ' +
              'contact support.';
          app.Notify.create(app.Notify.TYPE.ERROR_FORCE_SIGN_OUT, msg,
              new Chrome.Storage.LastError());
        }
        return _removeAuthToken;
      }).then(() => {
        // remove the Drive one too, if it exists
        return _removeAuthToken(app.Drive.SCOPES);
      });
    },

  };
})();
