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
	 * The background script for the extension.<br>
	 * Note: We can't be an Event Page because we use
	 * the chrome.webRequest API
	 * @namespace Background
	 */

	/**
	 * Version of localStorage - update when items are added, removed, changed
	 * @type {int}
	 * @default
	 * @memberOf Background
	 */
	const DATA_VERSION = 1;

	/**
	 * Default values in localStorage
	 * @type {{version: int, monitorClipboard: boolean, allowPush: boolean,
	 * autoSend: boolean, allowReceive: boolean, deviceSN: string,
	 * deviceNickname: string, storageDuration: number, notify: boolean,
	 * notifyOnSend: boolean, notifyOnReceive: boolean, devices: {},
	 * signedIn: boolean, needsCleanup: boolean, email: string,
	 * uid: string, photoURL: string, lastEmail: string, lastUid: string,
	 * registered: boolean}}
	 * @memberOf Background
	 */
	const DEF_VALUES = {
		'version': DATA_VERSION,
		'monitorClipboard': true,
		'allowPush': true,
		'autoSend': true,
		'allowReceive': true,
		'deviceSN': app.Utils.randomString(8),
		'deviceNickname': '',
		'storageDuration': 2,
		'notify': true,
		'notifyOnSend': false,
		'notifyOnReceive': true,
		'highPriority': true,
		'devices': {},
		'signedIn': false,
		'needsCleanup': false,
		'email': '',
		'uid': '',
		'photoURL': '',
		'lastEmail': '',
		'lastUid': '',
		'registered': false,
	};

	/**
	 * Initial {@link ClipItem}
	 * @type {string}
	 * @default
	 * @memberOf Background
	 */
	const INTRO_TEXT =
		`A clipboard manager with push notifications.

Please signin from the "Manage Account" page to share with your \
other devices.

You can click on the toolbar icon at any time to send the current \
contents of the clipboard to all your other devices.

Information you copy in most Chrome pages will \
automatically be sent if you have enabled that in "Settings".

You can display this page by right clicking on the toolbar icon and \
selecting "Options".

It is a good idea to go to the "Settings" page and enter a nickname \
for this device.`;

	/**
	 * Event: Fired when the extension is first installed,
	 * when the extension is updated to a new version,
	 * and when Chrome is updated to a new version.
	 * @see https://developer.chrome.com/extensions/runtime#event-onInstalled
	 * @param {object} details - type of event
	 * @private
	 * @memberOf Background
	 */
	function _onInstalled(details) {
		if (details.reason === 'install') {
			// extension installed
			// save OS
			app.Utils.getPlatformOS().then((os) => {
				app.Utils.set('os', os);
			});
			_initializeData();
			_showMainTab();
		} else if (details.reason === 'update') {
			// extension updated
			_updateData();
			_initializeFirebase().then(() => {
				return app.SW.update();
			}).catch((error) => {});
		}
		app.Alarm.updateAlarms();
	}

	/**
	 * Event: Fired when a profile that has this extension installed first
	 *     starts up
	 * @see https://developer.chrome.com/extensions/runtime#event-onStartup
	 * @private
	 * @memberOf Background
	 */
	function _onStartup() {
		app.Alarm.updateAlarms();
		app.Alarm.deleteOldClipItems();
		_initializeFirebase().catch((error) => {});
	}

	/**
	 * Event: Fired when a browser action icon is clicked.
	 * @see https://goo.gl/abVwKu
	 * @private
	 * @memberOf Background
	 */
	function _onIconClicked() {
		// get the clipboard contents
		const text = app.CB.getTextFromClipboard();
		if (app.Utils.isWhiteSpace(text)) {
			return;
		}

		// Persist
		app.ClipItem.add(text, Date.now(), false, false, app.Device.myName())
			.then((clipItem) => {
				app.Msg.sendClipItem(clipItem).catch((error) => {
					app.Gae.sendMessageFailed(error);
				});
			}).catch((error) => {});
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {object} request - details for the message
	 * @param {object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @return {boolean} true if asynchronous
	 * @private
	 * @memberOf Background
	 */
	function _onChromeMessage(request, sender, response) {
		let ret = false;

		if (request.message === 'removeDevice') {
			app.Devices.removeByName(request.deviceName);
		} else if (request.message === 'ping') {
			app.Msg.sendPing().catch((error) => {
				app.Gae.sendMessageFailed(error);
			});
		}
		return ret;
	}

	/**
	 * Event: Fired when the user clicked in a non-button area
	 * of the notification.
	 * @see https://developer.chrome.com/apps/notifications#event-onClicked
	 * @param {int} notificationId - type of notification
	 * @private
	 * @memberOf Background
	 */
	function _onNotificationClicked(notificationId) {
		_showMainTab();
		chrome.notifications.clear(notificationId, () => {});
	}

	/**
	 * Save the {@link DEF_VALUES} array to localStorage
	 * @private
	 * @memberOf Background
	 */
	function _saveDefaults() {
		Object.keys(DEF_VALUES).forEach(function(key) {
			if (app.Utils.get(key) === null) {
				app.Utils.set(key, DEF_VALUES[key]);
			}
		});
	}

	/**
	 * Initialize the data saved in localStorage
	 * @private
	 * @memberOf Background
	 */
	function _initializeData() {
		_saveDefaults();

		const introClip =
			new app.ClipItem(INTRO_TEXT, Date.now(), true,
				false, app.Device.myName());
		introClip.save();

		app.User.setInfo().catch((error) => {});
	}

	/**
	 * Update the data saved in localStorage
	 * @private
	 * @memberOf Background
	 */
	function _updateData() {
		// New items and removal of unused items can take place here
		// when the version changes
		// const oldVersion = app.Utils.get('version');

		_saveDefaults();
	}

	/**
	 * Initialize firebase and Service Worker if signed in
	 * @return {Promise<void>}
	 * @private
	 * @memberOf Background
	 */
	function _initializeFirebase() {
		if (app.Utils.isSignedIn()) {
			return app.SW.initialize().catch((error) => {});
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Send message to the main tab to focus it.<br>
	 * If not found, create it
	 * @private
	 * @memberOf Background
	 */
	function _showMainTab() {
		chrome.runtime.sendMessage({
			message: 'highlightTab',
		}, (response) => {
			if (!response) {
				// no one listening, create it
				chrome.tabs.create({url: '../html/main.html'});
			}
		});
	}

	/**
	 * Listen for extension install or update
	 */
	chrome.runtime.onInstalled.addListener(_onInstalled);

	/** 
	 * Listen for Chrome starting
	 */
	chrome.runtime.onStartup.addListener(_onStartup);

	/**
	 * Listen for click on the icon
	 */
	chrome.browserAction.onClicked.addListener(_onIconClicked);

	/**
	 * Listen for Chrome messages
	 */
	chrome.runtime.onMessage.addListener(_onChromeMessage);

	/**
	 * Listen for click on our notifications
	 */
	chrome.notifications.onClicked.addListener(_onNotificationClicked);

})(document);
