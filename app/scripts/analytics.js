/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
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


