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

		/** Get the extension's name
		 * @returns {string} name of extension
		 * @memberOf app.Utils
		 */
		getExtensionName: function() {
			return `chrome-extension://${chrome.runtime.id}`;
		},

		/**
		 * Get the Extension version
		 * @returns {string} Extension version
		 * @memberOf app.Utils
		 */
		getVersion: function() {
			const manifest = chrome.runtime.getManifest();
			return manifest.version;
		},

		/**
		 * Get the major Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @returns {int} Chrome major version
		 * @memberOf app.Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the full Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @returns {string} Chrome version
		 * @memberOf app.Utils
		 */
		getFullChromeVersion: function() {
			const raw = navigator.userAgent;
			return raw ? raw : 'Unknown';
		},

		/**
		 * Get the OS as a human readable string
		 * @returns {Promise.<string>} OS name
		 * @memberOf app.Utils
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
		 * Are we saving clipboard contents
		 * @returns {boolean} true if enabled
		 * @memberOf app.Utils
		 */
		isMonitorClipboard: function() {
			return app.Storage.get('monitorClipboard');
		},

		/**
		 * Has user enabled pushing to {@link app.Devices}
		 * @returns {boolean} true if enabled
		 * @memberOf app.Utils
		 */
		allowPush: function() {
			return app.Storage.get('allowPush');
		},

		/**
		 * Has user enabled autoSend option
		 * @returns {boolean} true if enabled
		 * @memberOf app.Utils
		 */
		isAutoSend: function() {
			return app.Storage.get('autoSend');
		},

		/**
		 * Has user enabled receiving from {@link app.Devices}
		 * @returns {boolean} true if enabled
		 * @memberOf app.Utils
		 */
		allowReceive: function() {
			return app.Storage.get('allowReceive');
		},

		/**
		 * Are we signed in
		 * @returns {boolean} true if signed in
		 * @memberOf app.Utils
		 */
		isSignedIn: function() {
			return app.Storage.get('signedIn');
		},

		/**
		 * Are we registered with fcm
		 * @returns {boolean} true if registered
		 * @memberOf app.Utils
		 */
		isRegistered: function() {
			return app.Storage.get('registered');
		},

		/**
		 * Are we not registered with fcm
		 * @returns {boolean} true if not registered
		 * @memberOf app.Utils
		 */
		notRegistered: function() {
			return !this.isRegistered();
		},

		/**
		 * Set the badge displayed on the extension icon
		 * @memberOf app.Utils
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
})(window);
