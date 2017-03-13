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
app.Gae = (function() {
	'use strict';

	/**
	 * Handle communication with Google App Engine server using Endpoints
	 * @see https://cloud.google.com/appengine/docs/standard/java/endpoints/
	 * @namespace Gae
	 */

	/**
	 * Base path of real gae server
	 * @const
	 * @default
	 * @private
	 * @memberOf Gae
	 */
	const GAE_ROOT_REMOTE = 'https://clip-man.appspot.com/_ah/api';

	// noinspection Eslint,JSUnusedLocalSymbols
	/**
	 * Base path of local testing server
	 * @const
	 * @default
	 * @private
	 * @memberOf Gae
	 */
	// eslint-disable-next-line no-unused-vars
	const GAE_ROOT_LOCAL = 'http://localhost:8080/_ah/api';

	// Set to GAE_ROOT_LOCAL for local testing
	const GAE_ROOT = GAE_ROOT_REMOTE;

	/**
	 * Project ID
	 * @const
	 * @default
	 * @private
	 * @memberOf Gae
	 */
	const PROJECT_ID = '597467211507';

	const HEADER_AUTHORIZATION = 'Authorization';
	const HEADER_CONTENT_TYPE = 'Content-Type';
	const HEADER_PROJECT_ID = 'project_id';
	const HEADER_ACCEPT = 'Accept';
	const CONTENT_TYPE_JSON = 'application/json';

	const ERROR_UNAUTHORIZED_USER = 'Unauthorized user';

	/**
	 * Retry call to Endpoint with new token
	 * @param {string} url - server Endpoint
	 * @param {string} token - authorization token
	 * @return {Promise.<void>}
	 * @private
	 * @memberOf Gae
	 */
	function _retryPost(url, token) {
		return app.User.removeCachedAuthToken(token).then(() => {
			return app.User.getAccessToken(false);
		}).then((token) => {
			return app.Gae.doPost(url, token, false);
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	return {

		/**
		 *  Root path to our gae server
		 * @type {string}
		 * @memberOf Gae
		 */
		GAE_ROOT: GAE_ROOT,

		/**
		 * Perform POST request to server
		 * @param {string} url - server Endpoint
		 * @param {string} token - authorization token
		 * @param {boolean} retry - if true, retry with new token on error
		 * @return {Promise.<void>}
		 * @memberOf Gae
		 */
		doPost: function(url, token, retry) {
			const headers = {
				[HEADER_AUTHORIZATION]: 'Bearer ' + token,
				[HEADER_PROJECT_ID]: PROJECT_ID,
				[HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
				[HEADER_ACCEPT]: CONTENT_TYPE_JSON,
			};

			const init = {
				method: 'POST',
				headers: headers,
			};

			return fetch(url, init).then((response) => {
				if (response.ok) {
					return response.json();
				} else if (retry && (response.status === 401)) {
					// could be bad token. Remove cached one and try again
					return _retryPost(url, token);
				} else {
					throw new Error('status: ' + response.status,
						'\nreason: ' + response.statusText);
				}
			}).then((json) => {
				if (json.success) {
					return Promise.resolve();
				} else if (retry && (json.reason === ERROR_UNAUTHORIZED_USER)) {
					// could be bad token. Try with new one
					return _retryPost(url, token);
				} else {
					throw new Error(json.reason);
				}
			}).catch((error) => {
				return Promise.reject(error);
			});
		},

		/**
		 * Get portion of {@link Device} stored on gae server
		 * @return {{}} Subset of {@link Device} info as object literal
		 * @memberOf Gae
		 */
		getDevice: function() {
			return {
				[app.Device.MODEL]: app.Device.myModel(),
				[app.Device.SN]: app.Device.mySN(),
				[app.Device.OS]: app.Device.myOS(),
				[app.Device.NICKNAME]: app.Device.myNickname(),
			};
		},

		/**
		 * Convert text to JSON
		 * @param {string} text - text to parse
		 * @return {JSON|null} parsed text, null if not valid JSON
		 * @memberOf Gae
		 */
		getJSON: function(text) {
			let response;
			try {
				response = JSON.parse(text);
			} catch (ex) {
				response = null;
			}
			return response;
		},

	};
})();
