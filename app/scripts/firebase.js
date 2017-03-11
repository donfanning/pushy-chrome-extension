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
app.Fb = (function() {
	'use strict';

	/**
	 * Manage interaction with firebase and its Namespaces
	 * @see https://firebase.google.com/docs/web/setup
	 *
	 *  @namespace Fb
	 */

	/**
	 * Error message for regToken
	 * @type {string}
	 * @default
	 * @memberOf Fb
	 */
	const ERROR_TOKEN =
		'Failed to obtain messaging token.\n';

	/**
	 * Firebase app
	 * @private
	 * @memberOf Fb
	 */
	let _app = null;

	/**
	 * Firebase messaging Namespace
	 * @private
	 * @memberOf Fb
	 */
	let _messaging;

	/**
	 * Firebase auth Namespace
	 * @private
	 * @memberOf Fb
	 */
	let _auth;

	/**
	 * Initialize firebase and its Namespaces
	 * @param {ServiceWorkerRegistration} swReg - use own ServiceWorker
	 * @return {Promise.<void>}
	 * @private
	 * @memberOf Fb
	 */
	function _initializeFirebase(swReg) {
		const config = {
			apiKey: 'AIzaSyBzqx2gVefRo3tvMFGRFs9gztd081pRgVg',
			authDomain: 'clip-man.firebaseapp.com',
			databaseURL: 'https://clip-man.firebaseio.com',
			storageBucket: 'clip-man.appspot.com',
			messagingSenderId: '597467211507',
		};

		return _deleteFirebaseApp().then(() => {
			_app = firebase.initializeApp(config);

			_auth = firebase.auth();

			_messaging = firebase.messaging();
			_messaging.useServiceWorker(swReg);

			/**
			 * Callback fired if Instance ID token is updated.
			 */
			_messaging.onTokenRefresh(_refreshRegToken);

		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	/**
	 * Delete firebase.app if it exists
	 * @return {Promise.<void>}
	 * @private
	 * @memberOf Fb
	 */
	function _deleteFirebaseApp() {
		if (_app) {
			return firebase.app().delete();
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Refresh the regToken when firebase changes it
	 * @private
	 * @memberOf Fb
	 */
	function _refreshRegToken() {
		_messaging.getToken().then((refreshedToken) => {
			if (app.Utils.isRegistered()) {
				app.Reg.refresh(refreshedToken).then(() => {
					_saveRegToken(refreshedToken);
				}).catch((error) => {});
			} else {
				// save token, not registered yet
				_saveRegToken(refreshedToken);
			}
		}).catch((error) => {});
	}

	/**
	 * Save registration token to localStorage
	 * @param {string} token - a registration token
	 * @private
	 * @memberOf Fb
	 */
	function _saveRegToken(token) {
		app.Utils.set('regId', token);
	}

	return {

		/**
		 * Initialize the firebase libraries
		 * @param {ServiceWorkerRegistration} swReg
		 * @return {Promise<void>}
		 * @memberOf Fb
		 */
		initialize: function(swReg) {
			return _initializeFirebase(swReg);
		},

		/**
		 * SignIn to firebase
		 * @param {string} token - token
		 * @return {Promise<object>} The current firebase user
		 * @memberOf Fb
		 */
		signIn: function(token) {
			return app.SW.initialize().then(() => {
				const credential =
					firebase.auth.GoogleAuthProvider.credential(null, token);
				// Authorize Firebase with the Google access token.
				return _auth.signInWithCredential(credential);
			}).then((user) => {
				return Promise.resolve(user);
			}).catch((error) => {
				return Promise.reject(error);
			});
		},

		/**
		 * Unregister Service Worker and sign-out of firebase
		 * @return {Promise<void>} An {@link Error} on reject
		 * @memberOf Fb
		 */
		signOut: function() {
			return app.SW.unregister().then(() => {
				return _auth.signOut();
			}).then(() => {
				return Promise.resolve();
			}).catch((error) => {
				return Promise.reject(error);
			});
		},

		/**
		 * Get the registration token for fcm
		 * @return {Promise<token>} A registration token for fcm
		 * @memberOf Fb
		 */
		getRegToken: function() {
			return _messaging.getToken().then((token) => {
				if (token) {
					_saveRegToken(token);
					return Promise.resolve(token);
				} else {
					return Promise.resolve(new Error(ERROR_TOKEN));
				}
			});
		},

	};

})();
