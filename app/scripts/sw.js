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
	const URL_FETCH_BASE = 'http://www.anyoldthing.com/?';

	/**
	 * Google search base path
	 * @const
	 * @default
	 * @type {string}
	 * @memberOf ServiceWorker
	 */
	const URL_SEARCH_BASE = 'https://www.google.com/search?q=';

	/**
	 * Path to extension
	 * @const
	 * @default
	 * @type {string}
	 * @memberOf ServiceWorker
	 */
	const URL_MAIN =
		'chrome-extension://jemdfhaheennfkehopbpkephjlednffd/html/main.html';

	/** @memberOf ServiceWorker */
	let URL_FETCH;

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
	 * @param {GaeMsg} data message object
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
	 * @param {GaeMsg} data message object
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
	 * @param {GaeMsg} data message object
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
	 * Send fake GET request so extension can intercept it and get the payload
	 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=452942
	 * @param {GaeMsg} data - Message packet
	 * @return {Promise<void>}
	 * @memberOf ServiceWorker
	 */
	function doFakeFetch(data) {
		URL_FETCH = `${URL_FETCH_BASE}${JSON.stringify(data)}`;
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
					doFakeFetch(data).catch(() => {});
					return Promise.resolve();
				}
			}

			return self.registration.getNotifications({
				tag: tag,
			}).then((notifications) => {
				if ((notifications.length > 0)) {
					// append to existing notification
					noteOpt.renotify = true;
					// count of notifications
					noteOpt.data = notifications[0].data + 1;
					title = `${noteOpt.data} new items\n${title}`;
				} else {
					noteOpt.data = 1;
				}
				// send data to extension
				doFakeFetch(data).catch(() => {});
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
		let url = URL_MAIN;
		if (event.action === 'search') {
			// clicked on search action
			url = URL_SEARCH_BASE + encodeURIComponent(event.notification.body);
		}

		event.notification.close();

		const promiseChain = clients.matchAll({
			includeUncontrolled: true,
			type: 'window',
		}).then((windowClients) => {
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
		});

		event.waitUntil(promiseChain);
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
})();
