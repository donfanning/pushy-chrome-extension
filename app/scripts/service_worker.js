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
app.SW = (function() {
	'use strict';

	/**
	 * Manage lifecycle of our {@link ServiceWorker}
	 * @namespace SW
	 */

	const ERROR_REG = 'Failed to register Service Worker: ';
	const ERROR_UNREG = 'Failed to unregister Service Worker: ';
	const ERROR_NOTREG = 'Not registered ';
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
	 * @return {Promise<ServiceWorkerRegistration>} reject with {@link Error}
	 * @private
	 * @memberOf SW
	 */
	function _register() {
		return navigator.serviceWorker.register(SERVICE_WORKER)
			.then(function(swReg) {
				_swRegistration = swReg;
				return Promise.resolve(_swRegistration);
			}).catch(function(error) {
				return Promise.reject(new Error(ERROR_REG + error.message));
			});
	}

	/**
	 * Unsubscribe from push notifications
	 * @return {Promise.<void>}
	 * @private
	 * @memberOf SW
	 */
	function _unsubscribePush() {
		return _swRegistration.pushManager.getSubscription()
			.then(function(subscription) {
				if (subscription) {
					return subscription.unsubscribe();
				} else {
					return Promise.reject(new Error('Not subscribed'));
				}
			}).then(function() {
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
	}

	return {

		/**
		 * Initialize the {@link ServiceWorker} and firebase
		 * @return {Promise<void>} reject with error
		 * @memberOf SW
		 */
		initialize: function() {
			if (_swRegistration) {
				return Promise.resolve();
			}

			return _register().then(function(swReg) {
				return app.Fb.initialize(swReg);
			}).then(function() {
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(new Error(ERROR_REG + error.message));
			});
		},

		/**
		 * Unregister the Service Worker
		 * @return {Promise<void>} reject with {@link Error}
		 * @memberOf SW
		 */
		unregister: function() {
			if (!_swRegistration) {
				return Promise.reject(new Error(ERROR_UNREG + ERROR_NOTREG));
			}

			return _unsubscribePush().then(function() {
				return _swRegistration.unregister();
			}).then(function(boolean) {
				if (!boolean) {
					throw new Error(ERROR_UNREG_BOOL);
				} else {
					_swRegistration = null;
					return Promise.resolve();
				}
			}).catch(function(error) {
				return Promise.reject(new Error(ERROR_UNREG + error.message));
			});
		},

		/**
		 * Update the Service Worker
		 * @return {Promise<void>} always resolves
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
