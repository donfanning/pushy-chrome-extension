/*
 *
 * Copyright 2016 Michael A Updike
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
window.app = window.app || {};
app.User = (function() {
	'use strict';

	/**
	 * Manage the current user
	 * @namespace User
	 */

	const ERROR_ALREADY_SIGNED_IN = 'Already signed in';

	/**
	 * Event: Fired when signin state changes for an account on the user's
	 *     profile.
	 * @see https://developer.chrome.com/apps/identity#event-onSignInChanged
	 * @param {object} account - chrome AccountInfo
	 * @param {boolean} signedIn - true if signedIn
	 * @private
	 * @memberOf User
	 */
	function _onSignInChanged(account, signedIn) {
		const uid = app.Utils.get('uid');
		if (app.Utils.isSignedIn() && !signedIn && (account.id == uid)) {
			// our user signed out of Chrome while we were signed in
			app.Utils.set('needsCleanup', true);
			app.Utils.set('signedIn', false);
			app.Utils.set('registered', false);
			app.Utils.set('cleanupRegToken', app.Utils.get('regToken'));
			app.Fb.signOut();
		}
		app.User.setInfo();
	}

	/**
	 * Listen for changes to Browser sign-in
	 */
	chrome.identity.onSignInChanged.addListener(_onSignInChanged);

	return {

		/**
		 * SignIn with OAuth 2.0 and firebase
		 * @return {Promise<void>}
		 * @memberOf User
		 */
		signIn: function() {
			if (app.Utils.isSignedIn()) {
				return Promise.reject(new Error(ERROR_ALREADY_SIGNED_IN));
			}

			return app.User.getAccessToken(true).then(function(token) {
				return app.Fb.signIn(token);
			}).then(function() {
				app.Utils.set('signedIn', true);
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
		},

		/**
		 * Sign-out of firebase
		 * @return {Promise<void>}
		 * @memberOf User
		 */
		signOut: function() {
			if (!app.Utils.isSignedIn()) {
				return Promise.resolve();
			}

			return app.Fb.signOut().then(function() {
				app.Utils.set('signedIn', false);
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
		},


		/**
		 * Sign in and register {@link Device}
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		addAccess: function() {

			/**
			 * Cleanup if user signed-out of Browser
			 * @return {Promise.<void>}
			 * @memberOf User
			 */
			function ifCleanup() {
				if (app.Utils.get('needsCleanup')) {
					app.Utils.set('needsCleanup', false);
					return app.User.cleanup();
				} else {
					return Promise.resolve();
				}
			}

			return ifCleanup().then(function() {
				return app.User.signIn();
			}).then(function() {
				return app.Reg.register();
			}).then(function() {
				return app.Msg.sendDeviceAdded();
			}).then(function() {
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
		},

		/**
		 * Unregister {@link Device} and sign out
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		removeAccess: function() {
			return app.Msg.sendDeviceRemoved().then(function() {
				return app.Reg.unregister();
			}).then(function() {
				return app.User.signOut();
			}).then(function() {
				app.Devices.clear();
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
		},

		/**
		 * Get a token for authorization
		 * @see https://developer.chrome.com/apps/identity#method-getAuthToken
		 * @param {boolean} retry - if true, retry with new token on error
		 * @return {Promise<token>} An access token
		 * @memberOf User
		 */
		getAccessToken: function(retry) {
			// If signed in, first try to get token non-interactively.
			// If it fails, probably means token has expired or is invalid.
			const interactive = !app.Utils.isSignedIn();

			const chromep = new ChromePromise();
			return chromep.identity.getAuthToken({'interactive': interactive})
				.then(function(accessToken) {
					if (chrome.runtime.lastError) {
						const error = chrome.runtime.lastError.message;
						if (retry && error && accessToken) {
							// cached token may be expired or invalid.
							// remove it and try again
							return app.User.removeCachedAuthToken(accessToken)
								.then(function() {
									return app.User.getAccessToken(false);
								}).catch(function(error) {
									return Promise.reject(error);
								});
						} else {
							throw new Error(error);
						}
					} else {
						return Promise.resolve(accessToken);
					}
				}).catch(function(error) {
					return Promise.reject(error);
				});
		},

		/**
		 * Cleanup after user signs out of Browser
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		cleanup: function() {
			return app.User.getAccessToken(false).then(function(accessToken) {
				return app.User.removeCachedAuthToken(accessToken);
			}).then(function() {
				return Promise.resolve();
			}).catch(function() {
				return Promise.resolve();
			});
		},

		/**
		 * Remove Auth token from cache
		 * @param {string} token - Auth token
		 * @return {Promise<void>} always resolves
		 * @memberOf User
		 */
		removeCachedAuthToken: function(token) {
			const chromep = new ChromePromise();
			return chromep.identity.removeCachedAuthToken({'token': token});
		},

		/**
		 * Persist info on current Browser user (may be no-one)
		 * @return {Promise.<void>}
		 * @memberOf User
		 */
		setInfo: function() {
			const chromep = new ChromePromise();
			return chromep.identity.getProfileUserInfo().then(function(user) {
				app.Utils.set('lastUid', app.Utils.get('uid'));
				app.Utils.set('lastEmail', app.Utils.get('email'));
				app.Utils.set('email', user.email);
				app.Utils.set('uid', user.id);
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
		},

	};

})();
