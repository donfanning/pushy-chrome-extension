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
	 * Max retries on 500 errors
	 * @const
	 * @default
	 * @private
	 * @memberOf Gae
	 */
	const MAX_ATTEMPTS = 4;

	/**
	 * Delay multiplier for exponential back-off
	 * @const
	 * @default
	 * @private
	 * @memberOf Gae
	 */
	const DELAY_TIME = 1000;

	const HEADER_AUTHORIZATION = 'Authorization';
	const HEADER_CONTENT_TYPE = 'Content-Type';
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
		 * Perform POST request to server using exponential back-off
		 * @param {string} url - server Endpoint
		 * @param {string} token - authorization token
		 * @param {boolean} retryNewToken - if true,
		 * retry with new token on error
		 * @return {Promise.<void>}
		 * @memberOf Gae
		 */
		doPost: function(url, token, retryNewToken = false) {
			const headers = {
				[HEADER_AUTHORIZATION]: `Bearer ${token}`,
				[HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
				[HEADER_ACCEPT]: CONTENT_TYPE_JSON,
			};

			const init = {
				method: 'POST',
				headers: headers,
			};

			let attempts = 0;
			return _fetch(url, init);

			/**
			 * Fetch with exponential back-off
			 * @param {string} url - server Endpoint
			 * @param {object} init
			 * @return {Promise.<void>}
			 * @memberOf Gae
			 */
			function _fetch(url, init) {
				return fetch(url, init).then((response) => {
					if (response.ok) {
						return response.json();
					} else if (retryNewToken && (response.status === 401)) {
						// could be bad token. Remove cached one and try again
						return _retryPost(url, token);
					} else if ((attempts < MAX_ATTEMPTS) &&
						((response.status >= 500) && (response.status < 600))) {
						// temporary network issue, retry with back-off
						attempts++;
						const delay = (Math.pow(2, attempts) - 1) * DELAY_TIME;
						return new Promise(() => {
							setTimeout(() => {
								return _fetch(url, init);
							}, delay);
						});
					} else {
						throw new Error('status: ' + response.status,
							'\nreason: ' + response.statusText);
					}
				}).then((json) => {
					if (json.success) {
						return Promise.resolve();
					} else if (retryNewToken &&
						(json.reason === ERROR_UNAUTHORIZED_USER)) {
						// could be bad token. Try with new one
						return _retryPost(url, token);
					} else {
						throw new Error(json.reason);
					}
				});
			}
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
