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
app.Utils = (function() {
	'use strict';

	/**
	 * Misc. utility methods
	 * @namespace Utils
	 */

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
		 * @return {string}
		 * @memberOf Utils
		 */
		getExtensionName: function() {
			return `chrome-extension://${chrome.runtime.id}`;
		},

		/**
		 * Get the Extension version
		 * @return {string} Extension version
		 * @memberOf Utils
		 */
		getVersion: function() {
			const manifest = chrome.runtime.getManifest();
			return manifest.version;
		},

		/**
		 * Get the major Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @return {int} Chrome major version
		 * @memberOf Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the full Chrome version
		 * @see https://goo.gl/2ITMNO
		 * @return {string} Chrome version
		 * @memberOf Utils
		 */
		getFullChromeVersion: function() {
			const raw = navigator.userAgent;
			return raw ? raw : 'Unknown';
		},

		/**
		 * Get the OS as a human readable string
		 * @return {Promise.<string>} OS name
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
		 * @return {JSON|null} JSON object, null if key does not exist
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
		 * @param {Object|null} value - new value, if null remove item
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
		 * Are we saving clipboard contents
		 * @return {boolean} true if enabled
		 * @memberOf Utils
		 */
		isMonitorClipboard: function() {
			return app.Utils.get('monitorClipboard');
		},

		/**
		 * Has user enabled pushing to {@link Devices}
		 * @return {boolean} true if enabled
		 * @memberOf Utils
		 */
		allowPush: function() {
			return app.Utils.get('allowPush');
		},

		/**
		 * Has user enabled autoSend option
		 * @return {boolean} true if enabled
		 * @memberOf Utils
		 */
		isAutoSend: function() {
			return app.Utils.get('autoSend');
		},

		/**
		 * Has user enabled receiving from {@link Devices}
		 * @return {boolean} true if enabled
		 * @memberOf Utils
		 */
		allowReceive: function() {
			return app.Utils.get('allowReceive');
		},

		/**
		 * Are we signed in
		 * @return {boolean} true if signed in
		 * @memberOf Utils
		 */
		isSignedIn: function() {
			return this.get('signedIn');
		},

		/**
		 * Are we registered with fcm
		 * @return {boolean} true if registered
		 * @memberOf Utils
		 */
		isRegistered: function() {
			return this.get('registered');
		},

		/**
		 * Are we not registered with fcm
		 * @return {boolean} true if not registered
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
		 * @return {boolean} true if str is whitespace (or null)
		 * @memberOf Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get a date string in time ago format
		 * @param {int} time - time since epoch in millis
		 * @return {string} Relative time format
		 * @memberOf Utils
		 */
		getRelativeTime: function(time) {
			return `${moment(time).fromNow()}, ` +
				`${moment(time).format('h:mm a')}`;
		},

		/**
		 * Get a random string of the given length
		 * @param {int|null} len - length of generated string, 8 if null
		 * @return {string} a random string
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
