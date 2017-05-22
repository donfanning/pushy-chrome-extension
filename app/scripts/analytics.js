/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage Google Analytics tracking
 * @namespace
 */
app.GA = (function() {
	'use strict';

	/**
	 * Tracking ID
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.GA
	 */
	const TRACKING_ID = 'UA-61314754-3';

	/**
	 * Google Analytics Event
	 * @typedef {Object} GAEvent
	 * @property {string} eventCategory - category
	 * @property {string} eventAction - action
	 * @property {string} eventLabel - label
	 * @property {boolean} noInteraction - direct user interaction?
	 */

	/**
	 * Event types
	 * @type {{}}
	 * @property {GAEvent} INSTALLED - extension installed
	 * @property {GAEvent} UPDATED - extension updated
	 * @property {GAEvent} SENT - message sent
	 * @property {GAEvent} RECEIVED - message received
	 * @property {GAEvent} REGISTERED - {@link Device} registered
	 * @property {GAEvent} UNREGISTERED - {@link Device} unregistered
	 * @const
	 * @memberOf app.GA
	 */
	const EVENT = {
		INSTALLED: {
			eventCategory: 'extension',
			eventAction: 'installed',
			eventLabel: '',
			noInteraction: false,
		},
		UPDATED: {
			eventCategory: 'extension',
			eventAction: 'updated',
			eventLabel: '',
			noInteraction: true,
		},
		MENU: {
			eventCategory: 'ui',
			eventAction: 'menuSelect',
			eventLabel: '',
			noInteraction: false,
		},
		TOGGLE: {
			eventCategory: 'ui',
			eventAction: 'toggle',
			eventLabel: '',
			noInteraction: false,
		},
		LINK: {
			eventCategory: 'ui',
			eventAction: 'linkSelect',
			eventLabel: '',
			noInteraction: false,
		},
		TEXT: {
			eventCategory: 'ui',
			eventAction: 'textChanged',
			eventLabel: '',
			noInteraction: false,
		},
		BUTTON: {
			eventCategory: 'ui',
			eventAction: 'buttonClicked',
			eventLabel: '',
			noInteraction: false,
		},
		SENT: {
			eventCategory: 'message',
			eventAction: 'sent',
			eventLabel: '',
			noInteraction: false,
		},
		RECEIVED: {
			eventCategory: 'message',
			eventAction: 'received',
			eventLabel: '',
			noInteraction: true,
		},
		REGISTERED: {
			eventCategory: 'register',
			eventAction: 'registered',
			eventLabel: '',
			noInteraction: false,
		},
		UNREGISTERED: {
			eventCategory: 'register',
			eventAction: 'unregistered',
			eventLabel: '',
			noInteraction: false,
		},
	};

	/**
	 * Event: called when document and resources are loaded<br />
	 * Initialize Google Analytics
	 * @private
	 * @memberOf app.GA
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
		ga('set', 'appName', 'Pushy');
		ga('set', 'appId', 'pushy-chrome-extension');
		ga('set', 'appVersion', app.Utils.getVersion());
		ga('require', 'displayfeatures');
	}

	// listen for document and resources loaded
	window.addEventListener('load', _onLoad);

	return {
		EVENT: EVENT,

		/**
		 * Send a page
		 * @param {string} page - page path
		 * @memberOf app.GA
		 */
		page: function(page) {
			if (page) {
				ga('send', 'pageview', page);
			}
		},

		/**
		 * Send an event
		 * @param {GAEvent} event - the event type
		 * @param {?string} [label=null] - override label
		 * @param {?string} [action=null] - override action
		 * @memberOf app.GA
		 */
		event: function(event, label=null, action=null) {
			if (event) {
				// shallow copy
				const ev = JSON.parse(JSON.stringify(event));
				ev.hitType = 'event';
				ev.eventLabel = label ? label : ev.eventLabel;
				ev.eventAction = action ? action : ev.eventAction;
				ga('send', ev);
			}
		},

		/**
		 * Send an error
		 * @param {?string} [label=null] - override label
		 * @param {?string} [action=null] - override action
		 * @memberOf app.GA
		 */
		error: function(label=null, action=null) {
			const ev = {
				eventCategory: 'error',
				eventAction: 'unknownMethod',
				eventLabel: '',
				noInteraction: true,
			};
			ev.hitType = 'event';
			ev.eventLabel = label ? label : ev.eventLabel;
			ev.eventAction = action ? action : ev.eventAction;
			ga('send', ev);
		},

		/**
		 * Send an exception
		 * @param {string} message - the error message
		 * @param {?string} [stack=null] - error stack
		 * @memberOf app.GA
		 */
		exception: function(message, stack = null) {
			let msg = '';
			if (message) {
				msg += message;
			}
			if (stack) {
				msg += `\n${stack}`;
			}
			ga('send', 'exception', {
				'exDescription': msg,
				'exFatal': true,
			});
			console.error(msg);
		},
	};
})();


