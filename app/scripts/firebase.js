/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage interaction with firebase and its Namespaces
 * @see https://firebase.google.com/docs/web/setup
 * @namespace
 */
app.Fb = (function() {
	'use strict';

	new ExceptionHandler();

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
	 * @returns {Promise.<void>} void
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

			// Callback fired if Instance ID token is updated.
			_messaging.onTokenRefresh(_refreshRegToken);
			return Promise.resolve();
		});
	}

	/**
	 * Delete firebase.app if it exists
	 * @returns {Promise.<void>} void
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
			if (app.Utils.isSignedIn()) {
				return app.Reg.register(refreshedToken);
			} else {
				return Promise.resolve();
			}
		}).catch((error) => {});
	}

	return {
		/**
		 * Initialize the firebase libraries
		 * @param {ServiceWorkerRegistration} swReg - service worker
		 * @returns {Promise<void>} void
		 * @memberOf Fb
		 */
		initialize: function(swReg) {
			return _initializeFirebase(swReg);
		},

		/**
		 * SignIn to firebase
		 * @param {string} token - token
		 * @returns {Promise<Object>} The current firebase user
		 * @memberOf Fb
		 */
		signIn: function(token) {
			return app.SW.initialize().then(() => {
				const credential =
					firebase.auth.GoogleAuthProvider.credential(null, token);
				// Authorize Firebase with the Google access token.
				return _auth.signInWithCredential(credential);
			});
		},

		/**
		 * Unregister Service Worker and sign-out of firebase
		 * @returns {Promise<void>} An {@link Error} on reject
		 * @memberOf Fb
		 */
		signOut: function() {
			return app.SW.unregister().then(() => {
				return _auth.signOut();
			});
		},

		/**
		 * Get the registration token for fcm
		 * @returns {Promise<token>} A registration token for fcm
		 * @memberOf Fb
		 */
		getRegToken: function() {
			return _messaging.getToken().then((token) => {
				if (token) {
					return Promise.resolve(token);
				} else {
					return Promise.reject(new Error(ERROR_TOKEN));
				}
			});
		},
	};
})();
