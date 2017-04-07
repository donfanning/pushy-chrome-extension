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
(function() {
	'use strict';

	/**
	 * Service Worker to handle push notifications
	 * @namespace ServiceWorker
	 */

	/**
	 * Fake fetch base path
	 * @const
	 * @default
	 * @type {string}
	 * @memberOf ServiceWorker
	 */
	const URL_FETCH_BASE = 'https://pushy-clipboard.github.io/?';

	/**
	 * Google search base path
	 * @const
	 * @default
	 * @type {string}
	 * @memberOf ServiceWorker
	 */
	const URL_SEARCH_BASE = 'https://www.google.com/search?q=';

	/**
	 * Path to extension's main page
	 * @const
	 * @default
	 * @type {string}
	 * @memberOf ServiceWorker
	 */
	const URL_EXT =
		'chrome-extension://jemdfhaheennfkehopbpkephjlednffd/html/main.html';

	/** @memberOf ServiceWorker */
	const TAG_MESSAGE = 'tag-message';
	/** @memberOf ServiceWorker */
	const TAG_DEVICE = 'tag-device';

	/** @memberOf ServiceWorker */
	const ACTION_MESSAGE = 'm';
	/** @memberOf ServiceWorker */
	const ACTION_DEVICE_REMOVED = 'remove_our_device';

	/** @memberOf ServiceWorker */
	const IC_REMOTE_COPY = '../images/ic_remote_copy.png';
	/** @memberOf ServiceWorker */
	const IC_ADD_DEVICE = '../images/ic_add_device.png';
	/** @memberOf ServiceWorker */
	const IC_REMOVE_DEVICE = '../images/ic_remove_device.png';
	/** @memberOf ServiceWorker */
	const IC_SEARCH = '../images/search-web.png';

	// temporary variable to help get all messages at Chrome start-up
	// normally, can't use globals in service worker, but this is
	// only used when Chrome first starts up. Pretty sure it won't be
	// stopped during this time
	// could use indexedDB if we really have to
	/** @memberOf ServiceWorker */
	let msgArr = [];

	/**
	 * Service Worker Events
	 * @typedef {Event} SWEvent
	 * @property {Function} waitUntil(Promise) - wait till promise returns
	 * @property {Object} notification - notification
	 * @property {Object} action - notification action
	 * @memberOf ServiceWorker
	 */

	/**
	 * Get the name of the Device who sent the message
	 * @param {GaeMsg} data  - message object
	 * @return {string} device name
	 * @memberOf ServiceWorker
	 */
	function getDeviceName(data) {
		let name;
		if (data.dN) {
			name = data.dN;
		} else {
			name = `${data.dM} - ${data.dSN} - ${data.dOS}`;
		}
		return name;
	}

	/**
	 * Get the tag for the notification
	 * @param {GaeMsg} data - message object
	 * @return {string} notification tag
	 * @memberOf ServiceWorker
	 */
	function getTag(data) {
		let tag = TAG_DEVICE;
		if (data.act === ACTION_MESSAGE) {
			tag = TAG_MESSAGE;
		}
		return tag;
	}

	/**
	 * Get the icon for the notification
	 * @param {GaeMsg} data - message object
	 * @return {string} path to icon
	 * @memberOf ServiceWorker
	 */
	function getIcon(data) {
		let path = IC_ADD_DEVICE;
		if (data.act === ACTION_MESSAGE) {
			path = IC_REMOTE_COPY;
		} else if (data.act === ACTION_DEVICE_REMOVED) {
			path = IC_REMOVE_DEVICE;
		}
		return path;
	}

	/**
	 * Send any data attached to a notification to the extension
	 * @param {GaeMsg[]} dataArray - possible array of {@link GaeMsg} objects
	 * @return {Promise<void>} always resolves
	 */
	function processNotificationData(dataArray) {
		if (dataArray instanceof Array) {
			return doFakeFetch(dataArray).catch(() => {});
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Send fake GET request so extension can intercept it and get the payload
	 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=452942
	 * @param {GaeMsg[]} dataArray Array of {@link GaeMsg} objects
	 * @return {Promise<void>} fails if extension successfully canceled request
	 * @memberOf ServiceWorker
	 */
	function doFakeFetch(dataArray) {
		msgArr = [];
		const URL_FETCH = URL_FETCH_BASE + JSON.stringify(dataArray);
		return fetch(URL_FETCH, {method: 'GET'});
	}

	/**
	 * Event: Received push message
	 * @param {SWEvent} event - the event
	 * @memberOf ServiceWorker
	 */
	function onPush(event) {
		const payload = event.data.json();
		const data = payload.data;
		data.m = decodeURIComponent(data.m);
		const tag = getTag(data);
		const noteOpt = {
			requireInteraction: (tag === TAG_MESSAGE),
			body: data.m,
			icon: getIcon(data),
			tag: tag,
			timestamp: Date.now(),
			data: null,
		};
		if ((tag === TAG_MESSAGE)) {
			// add web search action
			noteOpt.actions = [{
				action: 'search',
				title: 'Search web',
				icon: IC_SEARCH,
			}];
		}
		let title = `From ${getDeviceName(data)}`;

		const promiseChain = clients.matchAll({
			includeUncontrolled: true,
			type: 'window',
		}).then((clients) => {
			for (let i = 0; i < clients.length; i++) {
				if (clients[i].focused === true) {
					// we have focus, don't display notification
					// send data to extension
					return doFakeFetch([data]).catch(() => {});
				}
			}

			return self.registration.getNotifications({
				tag: tag,
			}).then((notifications) => {
				if ((notifications.length > 0)) {
					// append to existing notification
					noteOpt.renotify = true;
					const noteData = notifications[0].data;
					if (noteData instanceof Array) {
						// data is in the notification
						// add current and send all to extension
						noteData.push(data);
						return processNotificationData(noteData).then(() => {
							title += `\n${noteData.length} new items`;
							// set data back to item count
							noteOpt.data = noteData.length;
							// simulate doFakeFetch cancel error
							throw new Error('fetch failed');
						});
					} else {
						// count of notifications
						noteOpt.data = notifications[0].data + 1;
						title = `${noteOpt.data} new items\n${title}`;
					}
				} else {
					// new notification
					noteOpt.data = 1;
				}
				// send data to extension
				return doFakeFetch([data]);
			}).then(() => {
				// Extension did not cancel the fake fetch
				// add data to the notification instead
				// this is necessary for Chrome OS at startup at least
				if (tag === TAG_MESSAGE) {
					msgArr.push(data);
					if (msgArr.length > 1) {
						title += `\n${msgArr.length} new items`;
					}
					// shallow copy
					noteOpt.data = JSON.parse(JSON.stringify(msgArr));
				}
				return self.registration.showNotification(title, noteOpt);
			}).catch(() => {
				// This is the normal outcome of the extension canceling
				// the fake fetch
				return self.registration.showNotification(title, noteOpt);
			});
		});

		event.waitUntil(promiseChain);
	}

	/**
	 * Event: Notification clicked.
	 * @param {SWEvent} event - the event
	 * @memberOf ServiceWorker
	 */
	function onNotificationClick(event) {
		let url = URL_EXT;
		if (event.action === 'search') {
			// clicked on search action
			url = URL_SEARCH_BASE + encodeURIComponent(event.notification.body);
		}

		event.notification.close();

		const promiseChain = clients.matchAll({
			includeUncontrolled: true,
			type: 'window',
		}).then((windowClients) => {
			return processNotificationData(event.notification.data).then(() => {
				for (let i = 0; i < windowClients.length; i++) {
					const client = windowClients[i];
					if ((client.url === url) && 'focus' in client) {
						// tab exists, focus it
						return client.focus();
					}
				}
				if (clients.openWindow) {
					// create new tab
					return clients.openWindow(url);
				}
			}).catch(() => {});
		});

		event.waitUntil(promiseChain);
	}

	/**
	 * Event: Notification closed - can't open or focus window here.
	 * @param {SWEvent} event - the event
	 * @memberOf ServiceWorker
	 */
	function onNotificationClose(event) {
		event.waitUntil(
			processNotificationData(event.notification.data).catch(() => {})
		);
	}

	// Listen for install events
	self.addEventListener('install', (event) => {
		event.waitUntil(self.skipWaiting());
	});

	// Listen for activate events
	self.addEventListener('activate', (event) => {
		event.waitUntil(self.clients.claim());
	});

	// Listen for push events
	self.addEventListener('push', onPush);

	// Listen for notificationclick events
	self.addEventListener('notificationclick', onNotificationClick);

	// Listen for notificationclose events
	self.addEventListener('notificationclose', onNotificationClose);
})();
