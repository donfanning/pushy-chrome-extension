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
app.GA = (function() {
	'use strict';

	/**
	 * Manage Google Analytics tracking
	 * @namespace GA
	 */

	/**
	 * Tracking ID
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf GA
	 */
	const TRACKING_ID = 'UA-61314754-3';

	/**
	 * Google Analytics Event
	 * @typedef {object} GAEvent
	 * @property {string} cat - category
	 * @property {string} act - action
	 */

	/**
	 * Event types
	 * @type {object}
	 * @property {GAEvent} INSTALLED - extension installed
	 * @property {GAEvent} UPDATED - extension updated
	 * @property {GAEvent} SENT - message sent
	 * @property {GAEvent} RECEIVED - message received
	 * @property {GAEvent} REGISTERED - {@link Device} registered
	 * @property {GAEvent} UNREGISTERED - {@link Device} unregistered
	 * @const
	 * @memberOf GA
	 */
	const EVENT = {
		INSTALLED: {cat: 'extension', act: 'installed'},
		UPDATED: {cat: 'extension', act: 'updated'},
		SENT: {cat: 'message', act: 'sent'},
		RECEIVED: {cat: 'message', act: 'received'},
		REGISTERED: {cat: 'register', act: 'registered'},
		UNREGISTERED: {cat: 'register', act: 'unregistered'},
	};

	/**
	 * Event: called when document and resources are loaded<br />
	 * Initialize Google Analytics
	 * @private
	 * @memberOf GA
	 */
	function _onLoad() {
		// Standard Google Universal Analytics code
		// noinspection OverlyComplexFunctionJS
		(function(i, s, o, g, r, a, m) {
			i['GoogleAnalyticsObject'] = r;
			// noinspection CommaExpressionJS
			i[r] = i[r] || function() {
					(i[r].q = i[r].q || []).push(arguments);
				}, i[r].l = 1 * new Date();
			// noinspection CommaExpressionJS
			a = s.createElement(o),
				m = s.getElementsByTagName(o)[0];
			a.async = 1;
			a.src = g;
			m.parentNode.insertBefore(a, m);
		})(window, document, 'script',
			'https://www.google-analytics.com/analytics.js', 'ga');

		ga('create', TRACKING_ID, 'auto');
		// see: http://stackoverflow.com/a/22152353/1958200
		ga('set', 'checkProtocolTask', function() { });
		ga('require', 'displayfeatures');
	}

	// listen for document and resources loaded
	window.addEventListener('load', _onLoad);

	return {

		EVENT: EVENT,

		/**
		 * Send a page
		 * @memberOf GA
		 * @param {string} page - page path
		 */
		page: function(page) {
			if (page) {
				ga('send', 'pageview', page);
			}
		},

		/**
		 * Send an event
		 * @memberOf GA
		 * @param {GAEvent} event
		 */
		event: function(event) {
			if (event) {
				ga('send', 'event', event.cat, event.act);
			}
		},
	};

})();


