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

	/** @namespace ServiceWorker */


	const URL_FETCH_BASE = 'http://www.anyoldthing.com/?';
	const URL_SEARCH_BASE = 'https://www.google.com/search?q=';
	const URL_MAIN =
		'chrome-extension://dnginconopbhmnapbipjoohbgknhkdoh/html/main.html';

	let URL_FETCH;

	const TAG_MESSAGE = 'tag-message';
	const TAG_DEVICE = 'tag-device';

	const ACTION_MESSAGE = 'm';
	const ACTION_DEVICE_ADDED = 'add_our_device';
	const ACTION_DEVICE_REMOVED = 'remove_our_device';

	/**
	 * Icons
	 */
	const IC_REMOTE_COPY = '../images/ic_remote_copy.png';
	const IC_ADD_DEVICE = '../images/ic_add_device.png';
	const IC_REMOVE_DEVICE = '../images/ic_remove_device.png';

	/**
	 * temporary variables to help get
	 * all messages at Chrome start-up
	 */
	let msgDataArray = [];
	let deviceDataArray = [];

	self.addEventListener('install', function() {
		self.skipWaiting();
	});

	self.addEventListener('activate', function() {
		clients.claim();
	});

	/**
	 * Get the name of the Device who sent the message
	 *
	 * @param {JSON} data message object
	 * @return {string} device name
	 * @memberOf ServiceWorker
	 */
	function getDeviceName(data) {
		let name;
		if (data.dN) {
			name = data.dN;
		} else {
			name = data.dM + ' - ' + data.dSN + ' - ' + data.dOS;
		}
		return name;
	}

	/**
	 * Get the tag for the notification
	 *
	 * @param {JSON} data message object
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
	 *
	 * @param {JSON} data message object
	 * @return {string|null} path to icon, null for
	 * actions without notifications (ping based)
	 * @memberOf ServiceWorker
	 */
	function getIcon(data) {
		let path = '';
		if (data.act === ACTION_MESSAGE) {
			path = IC_REMOTE_COPY;
		} else if (data.act === ACTION_DEVICE_ADDED) {
			path = IC_ADD_DEVICE;
		} else if (data.act === ACTION_DEVICE_REMOVED) {
			path = IC_REMOVE_DEVICE;
		}
		return path;
	}

	/**
	 * Send fake GET request so extension can intercept it<br />
	 * and get the payload
	 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=452942
	 *
	 * @param {Array} dataArray Array of JSON objects
	 * @return {Promise<void>} always resolves
	 * @memberOf ServiceWorker
	 */
	function doFakeFetch(dataArray) {
		msgDataArray = [];
		deviceDataArray = [];
		URL_FETCH = URL_FETCH_BASE + JSON.stringify(dataArray);
		return new Promise(function(resolve, reject) {
			fetch(URL_FETCH, {method: 'GET'}).then(function() {
				resolve();
			}).catch(function(error) {
				reject(error);
			});
		});
	}

	/**
	 * Listen for push events
	 */
	self.addEventListener('push', (event) => {
		const payload = event.data.json();
		payload.data.message = decodeURIComponent(payload.data.message);
		const data = payload.data;
		let dataArray = [data];
		const deviceName = getDeviceName(data);
		let title = 'From ' + deviceName;
		const body = payload.data.message;
		const tag = getTag(data);
		const icon = getIcon(data);

		const promiseChain =
			clients.matchAll({includeUncontrolled: true}).then((clients) => {
				let mustShowNotification = true;
				for (let i = 0; i < clients.length; i++) {
					if (clients[i].focused === true) {
						mustShowNotification = false;
						break;
					}
				}

				// skip notifications for ping type messages
				// Chrome will display scare notification anyways
				if (mustShowNotification && !icon) {
					mustShowNotification = false;
				}

				if (mustShowNotification) {
					// if we don't have focus, show notification
					return self.registration.getNotifications({tag: tag})
						.then((notifications) => {
							const noteOptions = {
								requireInteraction: true,
								body: body,
								icon: icon,
								tag: tag,
								timestamp: Date.now(),
							};
							if (tag === TAG_MESSAGE) {
								noteOptions.actions = [{
									action: 'search',
									title: 'Search web',
									icon: '../images/search-web.png',
								}];
							}
							if (notifications.length > 0) {
								// append our data to existing notification
								noteOptions.renotify = true;
								dataArray = notifications[0].data;
								dataArray.push(data);
								title = dataArray.length + ' new items\n' +
									title;
								noteOptions.data = dataArray;
							} else {
								// this is for Chrome start-up so we can keep
								// data because only last notification will be
								// created this will also handle the first
								// notification when extension doesn't have
								// focus
								if (tag === TAG_MESSAGE) {
									msgDataArray.push(data);
									if (msgDataArray.length > 1) {
										title = title + '\n' +
											msgDataArray.length + ' new items';
									}
									// shallow copy
									noteOptions.data = JSON.parse(
										JSON.stringify(msgDataArray));
								} else if (tag === TAG_DEVICE) {
									deviceDataArray.push(data);
									if (deviceDataArray.length > 1) {
										title = title + '\n' +
											deviceDataArray.length +
											' new items';
									}
									// shallow copy
									noteOptions.data = JSON.parse(
										JSON.stringify(deviceDataArray));
								}
							}
							// return the notification.
							return self.registration
								.showNotification(title, noteOptions);
						});
				} else {
					// Our extension is focused, skip notification
					return doFakeFetch(dataArray).catch(function() {});
				}
			});

		event.waitUntil(
			promiseChain
		);
	});

	/**
	 * Listen for notificationclick events
	 */
	self.addEventListener('notificationclick', function(event) {
		event.notification.close();

		let url = URL_MAIN;

		if (event.action === 'search') {
			url = URL_SEARCH_BASE + encodeURIComponent(event.notification.body);
		}

		doFakeFetch(event.notification.data).catch(function() {});

		event.waitUntil(clients.matchAll({
				includeUncontrolled: true,
				type: 'window',
			}).then(function(windowClients) {
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
	 * Listen for notificationclose events
	 */
	self.addEventListener('notificationclose', function(event) {
		// can't open or focus window here.
		event.waitUntil(
			doFakeFetch(event.notification.data).catch(function() {})
		);
	});
})();
