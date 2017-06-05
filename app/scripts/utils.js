/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Misc. utility methods
 * @namespace
 */
app.Utils = (function() {
	'use strict';

	new ExceptionHandler();

	const MIN_IN_DAY = 60 * 24;

	const MILLIS_IN_DAY = MIN_IN_DAY * 60 * 1000;

	return {
		/**
		 * Number of minutes in a day
		 * @const
		 * @type {int}
		 * @memberOf app.Utils
		 */
		MIN_IN_DAY: MIN_IN_DAY,

		/**
		 * Number of milliseconds a in day
		 * @const
		 * @type {int}
		 * @memberOf app.Utils
		 */
		MILLIS_IN_DAY: MILLIS_IN_DAY,

		/**
		 * Set the badge displayed on the extension icon
		 * @memberOf app.Utils
		 */
		setBadgeText: function() {
			let text = '';
			if (app.MyData.isSignedIn() && app.MyData.allowPush()) {
				text = 'SEND';
			}
			chrome.browserAction.setBadgeText({text: text});
		},

		/**
		 * Determine if a String is null or whitespace only
		 * @param {string} str - string to check
		 * @returns {boolean} true if str is whitespace (or null)
		 * @memberOf app.Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get a date string in time ago format
		 * @param {int} time - time since epoch in millis
		 * @returns {string} Relative time format
		 * @memberOf app.Utils
		 */
		getRelativeTime: function(time) {
			return `${moment(time).fromNow()}, ` +
				`${moment(time).format('h:mm a')}`;
		},

		/**
		 * Get a random string of the given length
		 * @param {int|null} len - length of generated string, 8 if null
		 * @returns {string} a random string
		 * @memberOf app.Utils
		 *
		 */
		randomString: function(len) {
			const POSS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
				'abcdefghijklmnopqrstuvwxyz0123456789';
			!len ? len = 8 : true;
			if (!len) {
				len = 8;
			}
			let text = '';
			for (let i = 0; i < len; i++) {
				text +=
					POSS.charAt(Math.floor(Math.random() * POSS.length));
			}
			return text;
		},
	};
})();
