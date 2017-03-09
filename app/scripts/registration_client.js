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
	const URL_BASE = app.Gae.GAE_ROOT + '/registration/v1/';

	const ERROR_REGISTER = 'Failed to register with the server.\n';
	const ERROR_UNREGISTER = 'Failed to unregister with the server.\n';
	const ERROR_REFRESH = 'Failed to refresh token on the server.\n';
	const ERROR_CHANGE_DEVICE = 'Failed to change device name.\n';

	/**
	 * Send request to server Endpoint
	 * @param {string} url - Endpoint path
	 * @param {string} errorPrefix - text prefix to add to Error on reject
	 * @return {Promise<void>}
	 * @private
	 * @memberOf Reg
	 */
	function _doCommand(url, errorPrefix) {
		return app.User.getAccessToken(true).then(function(token) {
			return app.Gae.doPost(url, token, true);
		}).then(function() {
			return Promise.resolve();
		}).catch(function(error) {
			return Promise.reject(new Error(errorPrefix + error));
		});
	}

	return {

		/**
		 * Register {@link Device} with server
		 * @return {Promise<void>}
		 * @memberOf Reg
		 */
		register: function() {
			if (app.Utils.isRegistered()) {
				return Promise.resolve();
			}

			return app.Fb.getRegToken().then(function(regId) {
				const device = app.Gae.getDevice();
				const url = URL_BASE + 'register/' +
					regId + '/' +
					encodeURIComponent(JSON.stringify(device));
				return _doCommand(url, ERROR_REGISTER);
			}).then(function() {
				app.Utils.set('registered', true);
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
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

			return app.Fb.getRegToken().then(function(regId) {
				const url = URL_BASE + 'unregister/' +
					regId;
				return _doCommand(url, ERROR_UNREGISTER);
			}).then(function() {
				app.Utils.set('registered', false);
				return Promise.resolve();
			}).catch(function(error) {
				// TODO unregister?
				return Promise.reject(error);
			});
		},

		/**
		 * Update firebase instanceId on server
		 * @param {string} newRegToken - the new instanceId
		 * @return {Promise<void>}
		 * @memberOf Reg
		 */
		refresh: function(newRegToken) {
			if (app.Utils.notRegistered()) {
				app.Utils.set('regId', newRegToken);
				return Promise.resolve();
			}

			const oldRegToken = app.Utils.get('regId');

			const url = URL_BASE + 'refresh/' +
				newRegToken + '/' +
				oldRegToken;

			return _doCommand(url, ERROR_REFRESH).then(function() {
				app.Utils.set('regId', newRegToken);
				app.Utils.set('registered', true);
				return Promise.resolve();
			}).catch(function(error) {
				return Promise.reject(error);
			});
		},

		/**
		 * Update {@link Device} name on server
		 * @return {Promise<void>}
		 * @memberOf Reg
		 */
		changeDeviceName: function() {
			if (app.Utils.notRegistered()) {
				return Promise.resolve();
			}

			return app.Fb.getRegToken().then(function(regId) {
				const device = app.Gae.getDevice();
				const url = URL_BASE + 'changeDeviceName/' +
					regId + '/' +
					encodeURIComponent(JSON.stringify(device));
				return _doCommand(url, ERROR_CHANGE_DEVICE);
			});
		},

	};
})();
