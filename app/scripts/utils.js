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
		 * @memberOf Utils
		 */
		MIN_IN_DAY: MIN_IN_DAY,

		/**
		 * Number of milliseconds a in day
		 * @const
		 * @type {int}
		 * @memberOf Utils
		 */
		MILLIS_IN_DAY: MILLIS_IN_DAY,

		/** Get the extension's name
		 * @returns {string} name of extension
		 * @memberOf Utils
		 */
		getExtensionName: function() {
			return `chrome-extension://${chrome.runtime.id}`;
		},

		/**
		 * Get the Extension version
		 * @returns {string} Extension version
		 * @memberOf Utils
		 */
		getVersion: function() {
			const manifest = chrome.runtime.getManifest();
			return manifest.version;
		},

		/**
		 * Get the major Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @returns {int} Chrome major version
		 * @memberOf Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the full Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @returns {string} Chrome version
		 * @memberOf Utils
		 */
		getFullChromeVersion: function() {
			const raw = navigator.userAgent;
			return raw ? raw : 'Unknown';
		},

		/**
		 * Get the OS as a human readable string
		 * @returns {Promise.<string>} OS name
		 * @memberOf Utils
		 */
		getPlatformOS: function() {
			const chromep = new ChromePromise();
			return chromep.runtime.getPlatformInfo().then((info) => {
				let output = 'Unknown';
				const os = info.os;
				switch (os) {
					case 'win':
						output = 'MS Windows';
						break;
					case 'mac':
						output = 'Mac';
						break;
					case 'android':
						output = 'Android';
						break;
					case 'cros':
						output = 'Chrome OS';
						break;
					case 'linux':
						output = 'Linux';
						break;
					case 'openbsd':
						output = 'OpenBSD';
						break;
					default:
						break;
				}
				return Promise.resolve(output);
			});
		},

		/**
		 * Get a JSON parsed value from localStorage
		 * @param {string} key - key to get value for
		 * @returns {JSON|null} JSON object, null if key does not exist
		 * @memberOf Utils
		 */
		get: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = JSON.parse(item);
			}
			return item;
		},

		/**
		 * JSON stringify and save a value to localStorage
		 * @param {string} key - key to set value for
		 * @param {?Object} value - new value, if null remove item
		 * @memberOf Utils
		 */
		set: function(key, value) {
			if (value !== null) {
				localStorage.setItem(key, JSON.stringify(value));
			} else {
				localStorage.removeItem(key);
			}
		},

		/**
		 * Get integer value from localStorage
		 * @param {!string} key - key to get value for
		 * @returns {?int} value as integer
		 * @memberOf Utils
		 */
		getInt: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = parseInt(item, 10);
			}
			return item;
		},

		/**
		 * Are we saving clipboard contents
		 * @returns {boolean} true if enabled
		 * @memberOf Utils
		 */
		isMonitorClipboard: function() {
			return app.Utils.get('monitorClipboard');
		},

		/**
		 * Has user enabled pushing to {@link Devices}
		 * @returns {boolean} true if enabled
		 * @memberOf Utils
		 */
		allowPush: function() {
			return app.Utils.get('allowPush');
		},

		/**
		 * Has user enabled autoSend option
		 * @returns {boolean} true if enabled
		 * @memberOf Utils
		 */
		isAutoSend: function() {
			return app.Utils.get('autoSend');
		},

		/**
		 * Has user enabled receiving from {@link Devices}
		 * @returns {boolean} true if enabled
		 * @memberOf Utils
		 */
		allowReceive: function() {
			return app.Utils.get('allowReceive');
		},

		/**
		 * Are we signed in
		 * @returns {boolean} true if signed in
		 * @memberOf Utils
		 */
		isSignedIn: function() {
			return this.get('signedIn');
		},

		/**
		 * Are we registered with fcm
		 * @returns {boolean} true if registered
		 * @memberOf Utils
		 */
		isRegistered: function() {
			return this.get('registered');
		},

		/**
		 * Are we not registered with fcm
		 * @returns {boolean} true if not registered
		 * @memberOf Utils
		 */
		notRegistered: function() {
			return !this.isRegistered();
		},

		/**
		 * Set the badge displayed on the extension icon
		 * @memberOf Utils
		 */
		setBadgeText: function() {
			let text = '';
			if (app.Utils.isSignedIn() && app.Utils.allowPush()) {
				text = 'SEND';
			}
			chrome.browserAction.setBadgeText({text: text});
		},

		/**
		 * Determine if a String is null or whitespace only
		 * @param {string} str - string to check
		 * @returns {boolean} true if str is whitespace (or null)
		 * @memberOf Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get a date string in time ago format
		 * @param {int} time - time since epoch in millis
		 * @returns {string} Relative time format
		 * @memberOf Utils
		 */
		getRelativeTime: function(time) {
			return `${moment(time).fromNow()}, ` +
				`${moment(time).format('h:mm a')}`;
		},

		/**
		 * Get a random string of the given length
		 * @param {int|null} len - length of generated string, 8 if null
		 * @returns {string} a random string
		 * @memberOf Utils
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
})(window);
