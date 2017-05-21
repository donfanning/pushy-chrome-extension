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

	const ERROR_REG = 'Failed to register Service Worker: ';
	const ERROR_UNREG = 'Failed to unregister Service Worker: ';
	const ERROR_NOT_REG = 'Not registered ';
	const ERROR_UNREG_BOOL = 'returned false';

	/**
	 * Path to our {@link ServiceWorker}
	 * @const
	 * @default
	 * @private
	 * @memberOf SW
	 */
	const SERVICE_WORKER = '../scripts/sw.js';

	/**
	 * Our ServiceWorkerRegistration object
	 * @private
	 * @memberOf SW
	 */
	let _swRegistration = null;

	/**
	 * Register the Service Worker
	 * Note: This can be called if already registered
	 * @returns {Promise<Object>} service worker
	 * @private
	 * @memberOf SW
	 */
	function _register() {
		return navigator.serviceWorker.register(SERVICE_WORKER)
			.then((swReg) => {
				_swRegistration = swReg;
				return Promise.resolve(_swRegistration);
			}).catch((error) => {
				return Promise.reject(new Error(ERROR_REG + error.message));
			});
	}

	/**
	 * Unsubscribe from push notifications
	 * @returns {Promise<void>} void
	 * @private
	 * @memberOf SW
	 */
	function _unsubscribePush() {
		return _swRegistration.pushManager.getSubscription()
			.then((subscription) => {
				if (subscription) {
					return subscription.unsubscribe();
				} else {
					return Promise.reject(new Error('Not subscribed'));
				}
			});
	}

	return {
		/**
		 * Initialize the {@link ServiceWorker} and firebase
		 * @returns {Promise<void>} void
		 * @memberOf SW
		 */
		initialize: function() {
			if (_swRegistration) {
				return Promise.resolve();
			}

			return _register().then((swReg) => {
				return app.Fb.initialize(swReg);
			}).then(() => {
				return Promise.resolve();
			}).catch((error) => {
				return Promise.reject(new Error(ERROR_REG + error.message));
			});
		},

		/**
		 * Unregister the Service Worker
		 * @returns {Promise<void>} void
		 * @memberOf SW
		 */
		unregister: function() {
			if (!_swRegistration) {
				return Promise.reject(new Error(ERROR_UNREG + ERROR_NOT_REG));
			}

			return _unsubscribePush().then(() => {
				return _swRegistration.unregister();
			}).then((boolean) => {
				if (!boolean) {
					throw new Error(ERROR_UNREG_BOOL);
				} else {
					_swRegistration = null;
					return Promise.resolve();
				}
			}).catch((error) => {
				return Promise.reject(new Error(ERROR_UNREG + error.message));
			});
		},

		/**
		 * Update the Service Worker
		 * @returns {Promise<void>} void always resolves
		 * @memberOf SW
		 */
		update: function() {
			if (_swRegistration) {
				_swRegistration.update();
			}
			return Promise.resolve();
		},
	};
})();
