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
		'chrome-extension://dnginconopbhmnapbipjoohbgknhkdoh/html/main.html';

	/** @memberOf ServiceWorker */
	let URL_FETCH;

	/** @memberOf ServiceWorker */
	const TAG_MESSAGE = 'tag-message';
	/** @memberOf ServiceWorker */
	const TAG_DEVICE = 'tag-device';

	/** @memberOf ServiceWorker */
	const ACTION_MESSAGE = 'm';
	/** @memberOf ServiceWorker */
	const ACTION_DEVICE_ADDED = 'add_our_device';
	/** @memberOf ServiceWorker */
	const ACTION_DEVICE_REMOVED = 'remove_our_device';
	/** @memberOf ServiceWorker */
	const ACTION_PING_RESPONSE = 'respond_to_ping';

	/** @memberOf ServiceWorker */
	const IC_REMOTE_COPY = '../images/ic_remote_copy.png';
	/** @memberOf ServiceWorker */
	const IC_ADD_DEVICE = '../images/ic_add_device.png';
	/** @memberOf ServiceWorker */
	const IC_REMOVE_DEVICE = '../images/ic_remove_device.png';
	/** @memberOf ServiceWorker */
	const IC_SEARCH = '../images/search-web.png';

	/**
	 * temporary variables to help get
	 * all messages at Chrome start-up
	 */
	/** @memberOf ServiceWorker */
	let msgArr = [];
	/** @memberOf ServiceWorker */
	let deviceArr = [];

	self.addEventListener('install', () => {
		self.skipWaiting();
	});

	self.addEventListener('activate', () => {
		clients.claim();
	});

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
		let path = '';
		if (data.act === ACTION_MESSAGE) {
			path = IC_REMOTE_COPY;
		} else if (data.act === ACTION_DEVICE_REMOVED) {
			path = IC_REMOVE_DEVICE;
		} else if (
			(data.act === ACTION_DEVICE_ADDED) ||
			(data.act === ACTION_PING_RESPONSE)) {
			path = IC_ADD_DEVICE;
		}
		return path;
	}

	/**
	 * Send fake GET request so extension can intercept it and get the payload
	 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=452942
	 * @param {Array} dataArray Array of JSON objects
	 * @return {Promise<void>}
	 * @memberOf ServiceWorker
	 */
	function doFakeFetch(dataArray) {
		msgArr = [];
		deviceArr = [];
		URL_FETCH = URL_FETCH_BASE + JSON.stringify(dataArray);
		return fetch(URL_FETCH, {method: 'GET'}).then(() => {
			return Promise.resolve();
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	// Listen for push events
	self.addEventListener('push', (event) => {
		const payload = event.data.json();
		const data = payload.data;
		data.m = decodeURIComponent(data.m);
		const tag = getTag(data);
		const icon = getIcon(data);
		const noteOpt = {
			requireInteraction: true,
			body: data.m,
			icon: icon,
			tag: tag,
			timestamp: Date.now(),
		};
		let dataArray = [data];
		let title = `From ${getDeviceName(data)}`;

		const promiseChain =
			clients.matchAll({includeUncontrolled: true}).then((clients) => {
			let showNotification = true;
			for (let i = 0; i < clients.length; i++) {
				if (clients[i].focused === true) {
					showNotification = false;
					break;
				}
			}

			if (!showNotification || (icon === '')) {
				// Our extension is focused, skip notification
				// or we were pinged
				return doFakeFetch(dataArray).catch(() => {});
			}

			return self.registration.getNotifications({
				tag: tag,
			}).then((notifications) => {
				if ((tag === TAG_MESSAGE)) {
					noteOpt.actions = [{
						action: 'search',
						title: 'Search web',
						icon: IC_SEARCH,
					}];
				}
				if ((notifications.length > 0)) {
					// append our data to existing notification
					noteOpt.renotify = true;
					dataArray = notifications[0].data;
					dataArray.push(data);
					title = `${dataArray.length} new items\n${title}`;
					noteOpt.data = dataArray;
				} else {
					// this is for Chrome start-up so we can keep
					// data because only last notification will be
					// created this will also handle the first
					// notification when extension doesn't have
					// focus
					if (tag === TAG_MESSAGE) {
						msgArr.push(data);
						if (msgArr.length > 1) {
							title += `\n${msgArr.length} new items`;
						}
						// shallow copy
						noteOpt.data = JSON.parse(JSON.stringify(msgArr));
					} else if (tag === TAG_DEVICE) {
						deviceArr.push(data);
						if (deviceArr.length > 1) {
							title += `\n${deviceArr.length} new items`;
						}
						// shallow copy
						noteOpt.data = JSON.parse(JSON.stringify(deviceArr));
					}
				}
				return self.registration.showNotification(title, noteOpt);
			});
		});

		event.waitUntil(
			promiseChain
		);
	});

	// Listen for notificationclick events
	self.addEventListener('notificationclick', (event) => {
		let url = URL_MAIN;
		if (event.action === 'search') {
			// clicked on search action
			url = URL_SEARCH_BASE + encodeURIComponent(event.notification.body);
		}

		event.notification.close();

		if (event.notification.icon !== '') {
			// chrome generated notification has no icon
			// we already handled it in push event
			doFakeFetch(event.notification.data).catch(function() {});
		}

		event.waitUntil(clients.matchAll({
				includeUncontrolled: true,
				type: 'window',
			}).then((windowClients) => {
				for (let i = 0; i < windowClients.length; i++) {
					const client = windowClients[i];
					if (client.url === url && 'focus' in client) {
						// tab exists, focus it
						return client.focus();
					}
				}
				if (clients.openWindow) {
					// create new tab
					return clients.openWindow(url);
				}
			})
		);
	});

	/**
	 * Event: Notification closed - can't open or focus window here.
	 * @param {event} event - the event
	 */
	function onNotificationClose(event) {
		if (event.notification.icon === '') {
			// chrome generated notification has no icon
			// we already handled it in push event
			return;
		}

		event.waitUntil(
			doFakeFetch(event.notification.data).catch(() => {})
		);
	}

	// Listen for notificationclose events
	self.addEventListener('notificationclose', onNotificationClose);
})();
