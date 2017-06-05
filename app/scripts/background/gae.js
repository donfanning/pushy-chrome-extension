/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle communication with Google App Engine server using Endpoints
 * @see https://cloud.google.com/appengine/docs/standard/java/endpoints/
 * @namespace
 */
app.Gae = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Base path of real gae server
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Gae
	 */
	const GAE_ROOT_REMOTE = 'https://clip-man.appspot.com/_ah/api';

	// noinspection Eslint,JSUnusedLocalSymbols
	/**
	 * Base path of local testing server
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Gae
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
	 * @memberOf app.Gae
	 */
	const MAX_ATTEMPTS = 4;

	/**
	 * Delay multiplier for exponential back-off
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Gae
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
	 * @returns {Promise.<void>} void
	 * @private
	 * @memberOf app.Gae
	 */
	function _retryPost(url, token) {
		return app.User.removeCachedAuthToken(token).then(() => {
			return app.User.getAuthToken(false);
		}).then((token) => {
			return app.Gae.doPost(url, token, false);
		});
	}

	return {
		/**
		 *  Root path to our gae server
		 * @type {string}
		 * @memberOf app.Gae
		 */
		GAE_ROOT: GAE_ROOT,

		/**
		 * Perform POST request to server using exponential back-off
		 * @param {string} url - server Endpoint
		 * @param {string} token - authorization token
		 * @param {boolean} retryNewToken - if true,
		 * retry with new token on error
		 * @returns {Promise.<void>} void
		 * @memberOf app.Gae
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
			 * @param {Object} init - fetch options
			 * @returns {Promise.<void>} void
			 * @memberOf app.Gae
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
						// eslint-disable-next-line promise/avoid-new
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
		 * @returns {JSON|null} parsed text, null if not valid JSON
		 * @memberOf app.Gae
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

		/**
		 * Notify listeners that send message failed
		 * @param {Error} err - what caused the failure
		 * @memberOf app.Gae
		 */
		sendMessageFailed: function(err) {
			app.CGA.error(err, 'GAE.sendMessageFailed');
			const msg = app.MyCMsg.MSG_FAILED;
			msg.error = err.toString();
			app.CMsg.send(msg).catch(() => {});
		},
	};
})();
