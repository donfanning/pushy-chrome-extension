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
app.Reg = (function() {
	'use strict';

	/**
	 * Handle RegistrationEndpoint tasks on the gae server
	 * @namespace Reg
	 */

	/**
	 * Base path of RegistrationEndpoint
	 * @type string
	 * @const
	 * @private
	 * @memberOf Reg
	 */
	const URL_BASE = `${app.Gae.GAE_ROOT}/registration/v1/`;

	const ERROR_REGISTER = 'Failed to register with the server.\n';
	const ERROR_UNREGISTER = 'Failed to unregister with the server.\n';

	/**
	 * Send request to server Endpoint
	 * @param {string} url - Endpoint path
	 * @param {string} errorPrefix - text prefix to add to Error on reject
	 * @return {Promise<void>}
	 * @private
	 * @memberOf Reg
	 */
	function _doCommand(url, errorPrefix) {
		return app.User.getAuthToken(true).then((token) => {
			return app.Gae.doPost(url, token, true);
		}).then(() => {
			return Promise.resolve();
		}).catch((error) => {
			throw new Error(errorPrefix + error);
		});
	}

	/**
	 * Event: Fired when item in localStorage changes
	 * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
	 * @param {Event} event
	 * @param {string} event.key - storage item that changed
	 * @private
	 * @memberOf Background
	 */
	function _onStorageChanged(event) {
		if (event.key === 'allowReceive') {
			const allowReceive = app.Utils.allowReceive();
			if (allowReceive) {
				// user wants to receive messages now
				app.Reg.register().catch((error) => {
					app.Utils.set('allowReceive', !allowReceive);
					chrome.runtime.sendMessage({
						message: 'registerFailed',
						error: error.toString(),
					}, () => {});
				});
			} else {
				// user no longer wants to receive messages
				app.Reg.unregister().catch((error) => {
					app.Utils.set('allowReceive', !allowReceive);
					chrome.runtime.sendMessage({
						message: 'unregisterFailed',
						error: error.toString(),
					}, () => {});
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
		 * @return {Promise<void>}
		 * @memberOf Reg
		 */
		register: function() {
			if (app.Utils.isRegistered() || !app.Utils.allowReceive()) {
				return Promise.resolve();
			}

			return app.Fb.getRegToken().then((regId) => {
				const url = `${URL_BASE}register/${regId}`;
				return _doCommand(url, ERROR_REGISTER);
			}).then(() => {
				app.Utils.set('registered', true);
				return Promise.resolve();
			});
		},

		/**
		 * Unregister {@link Device} with server
		 * @return {Promise<void>}
		 * @memberOf Reg
		 */
		unregister: function() {
			if (app.Utils.notRegistered()) {
				return Promise.resolve();
			}

			return app.Fb.getRegToken().then((regId) => {
				const url = `${URL_BASE}unregister/${regId}`;
				return _doCommand(url, ERROR_UNREGISTER);
			}).then(() => {
				app.Utils.set('registered', false);
				return Promise.resolve();
			});
		},
	};
})();
