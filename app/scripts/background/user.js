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

	const ERROR_ALREADY_SIGNED_IN = 'Already signed in';

	/**
	 * Event: Fired when signin state changes for an account on the user's
	 *     profile.
	 * @see https://developer.chrome.com/apps/identity#event-onSignInChanged
	 * @param {Object} account - chrome AccountInfo
	 * @param {boolean} signedIn - true if signedIn
	 * @private
	 * @memberOf app.User
	 */
	function _onSignInChanged(account, signedIn) {
		const uid = app.Storage.get('uid');
		if (app.MyData.isSignedIn() && !signedIn && (account.id === uid)) {
			// our user signed out of Chrome while we were signed in
			app.Storage.set('needsCleanup', true);
			_setSignIn(false);
			app.Storage.set('registered', false);
			app.Fb.signOut();

		}
		app.User.setInfo().catch((err) => {
			app.GA.error(err.message, 'User._onSignInChanged');
		});
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {app.MyCMsg.Message} request - details for the
	 * @param {Object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @returns {boolean} true if asynchronous
	 * @private
	 * @memberOf app.User
	 */
	function _onChromeMessage(request, sender, response) {
		let ret = false;

		if (request.message === app.MyCMsg.SIGN_IN.message) {
			// try to signIn a user
			ret = true; // async
			app.User.addAccess().then(() => {
				response({message: 'ok'});
				return Promise.resolve();
			}).catch((err) => {
				app.GA.error(err.message, 'User._onChromeMessage');
				app.User.removeAccess().then(() => {
					return Promise.resolve();
				}).catch((err) => {
					app.GA.error(err.message, 'User._onChromeMessage');
					_setSignIn(false);
					app.Storage.set('registered', false);
				});
				response({message: 'error', error: err.toString()});
			});
		} else if (request.message === app.MyCMsg.SIGN_OUT.message) {
			// try to signOut a user
			ret = true;  // async
			app.User.removeAccess().then(() => {
				response({message: 'ok'});
				return Promise.resolve();
			}).catch((err) => {
				app.GA.error(err.message, 'User._onChromeMessage');
				response({message: 'error', error: err.toString()});
			});
		}
		return ret;
	}

	/**
	 * Set signIn state
	 * @param {boolean} val - true if signed in
	 * @private
	 */
	function _setSignIn(val) {
		app.Storage.set('signedIn', val);
		app.Utils.setBadgeText();
		if (!val) {
			app.Storage.set('photoURL', '');
		}
	}

	/**
	 * Listen for changes to Browser sign-in
	 */
	chrome.identity.onSignInChanged.addListener(_onSignInChanged);

	/**
	 * Listen for Chrome messages
	 */
	app.CMsg.listen(_onChromeMessage);

	return {
		/**
		 * SignIn with OAuth 2.0 and firebase
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		signIn: function() {
			if (app.MyData.isSignedIn()) {
				return Promise.reject(new Error(ERROR_ALREADY_SIGNED_IN));
			}

			return app.User.getAuthToken(true).then((token) => {
				return app.Fb.signIn(token);
			}).then((user) => {
				_setSignIn(true);
				if (!app.Utils.isWhiteSpace(user.photoURL)) {
					app.Storage.set('photoURL', user.photoURL);
				}
				return Promise.resolve();
			});
		},

		/**
		 * Sign-out of firebase
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		signOut: function() {
			if (!app.MyData.isSignedIn()) {
				return Promise.resolve();
			}

			return app.Fb.signOut().then(() => {
				_setSignIn(false);
				return Promise.resolve();
			});
		},


		/**
		 * Sign in and register {@link Device}
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		addAccess: function() {

			/**
			 * Cleanup if user signed-out of Browser
			 * @returns {Promise<void>} void
			 * @memberOf app.User
			 */
			function ifCleanup() {
				if (app.Storage.getBool('needsCleanup')) {
					app.Storage.set('needsCleanup', false);
					return app.User.cleanup();
				} else {
					return Promise.resolve();
				}
			}

			return ifCleanup().then(() => {
				return app.User.signIn();
			}).then(() => {
				return app.Reg.register();
			}).then(() => {
				return app.Msg.sendDeviceAdded();
			});
		},

		/**
		 * Unregister {@link Device} and sign out
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		removeAccess: function() {
			return app.Msg.sendDeviceRemoved().then(() => {
				return app.Reg.unregister();
			}).then(() => {
				return app.User.signOut();
			}).then(() => {
				app.Devices.clear();
				return Promise.resolve();
			});
		},

		/**
		 * Get an OAuth2.0 token
		 * @see https://developer.chrome.com/apps/identity#method-getAuthToken
		 * @param {boolean} retry - if true, retry with new token on error
		 * @returns {Promise<token>} An access token
		 * @memberOf app.User
		 */
		getAuthToken: function(retry) {
			// If signed in, first try to get token non-interactively.
			// If it fails, probably means token has expired or is invalid.
			const interactive = !app.MyData.isSignedIn();

			const chromep = new ChromePromise();
			return chromep.identity.getAuthToken({
				'interactive': interactive,
			}).then((token) => {
				if (chrome.runtime.lastError) {
					const error = chrome.runtime.lastError.message;
					if (retry && error && token) {
						// cached token may be expired or invalid.
						// remove it and try again
						return app.User.removeCachedAuthToken(token)
							.then(() => {
								return app.User.getAuthToken(false);
							});
					} else {
						throw new Error(error);
					}
				} else {
					return Promise.resolve(token);
				}
			});
		},

		/**
		 * Cleanup after user signs out of Browser
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		cleanup: function() {
			return app.User.getAuthToken(false).then((token) => {
				return app.User.removeCachedAuthToken(token);
			});
		},

		/**
		 * Remove Auth token from cache
		 * @param {string} token - Auth token
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		removeCachedAuthToken: function(token) {
			const chromep = new ChromePromise();
			return chromep.identity.removeCachedAuthToken({'token': token});
		},

		/**
		 * Persist info on current Browser user (may be no-one)
		 * @returns {Promise<void>} void
		 * @memberOf app.User
		 */
		setInfo: function() {
			const chromep = new ChromePromise();
			return chromep.identity.getProfileUserInfo().then((user) => {
				app.Storage.set('email', user.email);
				app.Storage.set('uid', user.id);
				return Promise.resolve();
			});
		},
	};
})();
