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
	 * Alarm for cleaning up localStorage
	 * @type {string}
	 * @default
	 * @memberOf Background
	 */
	const ALARM_STORAGE = 'storage';

	/**
	 * Delay time for fcm message processing
	 * @type {int}
	 * @default
	 * @memberOf Background
	 */
	const MESSAGE_WAIT_MILLIS = 500;

	/**
	 * Delay time for reading from clipboard
	 * @type {int}
	 * @default
	 * @memberOf Background
	 */
	const CLIPBOARD_WAIT_MILLIS = 250;

	/**
	 * Version of localStorage - update when items are added, removed, changed
	 * @type {int}
	 * @default
	 * @memberOf Background
	 */
	const DATA_VERSION = 1;

	/**
	 * Default values of localStorage
	 * @type {object}
	 * @default
	 * @memberOf Background
	 */
	const DEF_VALUES = {
		'version': DATA_VERSION,
		'monitorClipboard': true,
		'allowPush': true,
		'autoSend': true,
		'deviceSN': app.Utils.randomString(8),
		'deviceNickname': '',
		'storageDuration': 2,
		'notify': true,
		'notifyOnSend': false,
		'notifyOnReceive': true,
		'devices': {},
		'signedIn': false,
		'email': '',
		'uid': '',
		'lastEmail': '',
		'lastUid': '',
		'registered': false,
		'regId': '',
	};

	/**
	 * Initial {@link ClipItem}
	 * @type {string}
	 * @default
	 * @memberOf Background
	 */
	const INTRO_TEXT =
		'I am Clip Man. The clipboard manager with push notifications.\n\n' +
		'Please signin from the "Manage Account" page to share with your ' +
		'other devices.\n\n You can click on the toolbar icon at any time ' +
		'to send the current contents of the clipboard to all your other ' +
		'devices.\n\nInformation you copy in most Chrome pages will' +
		' automatically be sent if you have enabled that in "Settings".\n\n' +
		'You can display this page by right clicking on the toolbar icon and ' +
		'selecting "Options"\n\nIt is a good idea to go to the "Settings" ' +
		'page and enter a nickname for this device.';

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
			app.Utils.getPlatformOS().then(function(os) {
				app.Utils.set('os', os);
			});
			_initializeData();
			_showMainTab();
		} else if (details.reason === 'update') {
			// extension updated
			_updateData();
			_initializeFirebase().then(function() {
				return app.SW.update();
			}).catch(function(error) {});
		}
		_updateAlarms();
	}

	/**
	 * Event: Fired when a profile that has this extension installed first
	 *     starts up
	 * @see https://developer.chrome.com/extensions/runtime#event-onStartup
	 * @private
	 * @memberOf Background
	 */
	function _onStartup() {
		_updateAlarms();
		_deleteOldClipItems();
		_initializeFirebase().catch(function(error) {});
	}

	/**
	 * Event: Fired when a browser action icon is clicked.
	 * @see https://goo.gl/abVwKu
	 * @private
	 * @memberOf Background
	 */
	function _onIconClicked() {
		// get the clipboard contents
		const text = _getTextFromClipboard();
		if (app.Utils.isWhiteSpace(text)) {
			return;
		}

		// Persist
		app.ClipItem.add(text, Date.now(), false, false, app.Device.myName())
			.then(function(clipItem) {
			if (app.Utils.allowPush() && app.Utils.isRegistered()) {
				// send to our devices
				app.Msg.sendClipItem(clipItem).catch(function(error) {
					_sendMessageFailed(error);
				});
			}
		});
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

		if (request.message === 'copiedToClipboard') {
			// we put data on the clipboard
			_addClipItemFromClipboard();
		} else if (request.message === 'copyToClipboard') {
			// copy a ClipItem to the clipboard
			const clip = request.clipItem;
			const clipItem =
				new app.ClipItem(clip.text, clip.lastSeen, clip.fav,
					clip.remote, clip.device);
			_copyToClipboard(clipItem.text);
			// send to our devices
			_sendLocalClipItem(clipItem);
		} else if (request.message === 'removeDevice') {
			app.Devices.removeByName(request.deviceName);
		} else if (request.message === 'deviceNameChanged') {
			app.Reg.changeDeviceName();
		} else if (request.message === 'ping') {
			// async
			ret = true;

			app.Msg.sendPing().catch(function(error) {
				_sendMessageFailed(error);
			});
		} else if (request.message === 'signIn') {
			// async
			ret = true;

			// try to signIn a user
			app.User.signIn().then(function() {
				return app.Reg.register();
			}).then(function() {
				// let our devices know
				return app.Msg.sendDeviceAdded();
			}).then(function() {
				response({
					message: 'ok',
				});
			}).catch(function(error) {
				app.User.signOut();
				response({
					message: 'error',
					error: error.toString(),
				});
			});
		} else if (request.message === 'signOut') {
			// async
			ret = true;

			// try to signOut a user
			app.Msg.sendDeviceRemoved().then(function() {
				return app.Reg.unregister();
			}).then(function() {
				return app.User.signOut();
			}).then(function() {
				app.Devices.clear();
				response({
					message: 'ok',
				});
			}).catch(function(error) {
				response({
					message: 'error',
					error: error.toString(),
				});
			});
		}
		return ret;
	}

	/**
	 * Event: Fired when the user clicked in a non-button area
	 *     of the notification.
	 * @see https://developer.chrome.com/apps/notifications#event-onClicked
	 * @param {int} notificationId - type of notification
	 * @private
	 * @memberOf Background
	 */
	function _onNotificationClicked(notificationId) {
		_showMainTab();
		chrome.notifications.clear(notificationId, function() {});
	}

	/**
	 * Event: Fired when an alarm has elapsed.
	 * @see https://developer.chrome.com/apps/alarms#event-onAlarm
	 * @param {object} alarm - details on alarm
	 * @private
	 * @memberOf Background
	 */
	function _onAlarm(alarm) {
		if (alarm.name === ALARM_STORAGE) {
			_deleteOldClipItems();
		}
	}

	/**
	 * Event: Fired when a request is about to occur.
	 * @see https://goo.gl/4j4RtY
	 * @param {object} details - details on the request
	 * @return {object} cancel the request
	 * @private
	 * @memberOf Background
	 */
	function _onWebRequestBefore(details) {
		const url = decodeURI(details.url);
		const regex = /http:\/\/www\.anyoldthing\.com\/\?(.*)/;
		const matches = url.match(regex);
		let text = matches[1];
		if (text) {
			const dataArray = JSON.parse(text);
			for (let i = 0; i < dataArray.length; i++) {
				(function(index) {
					setTimeout(function() {
						// slow down message stream
						_handleMessageReceived(dataArray[index]);
					}, MESSAGE_WAIT_MILLIS);
				})(i);
			}
		}
		// cancel fake request
		return {cancel: true};
	}

	/**
	 * Event: Fired when item in localStorage changes
	 * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
	 * @param {Event} event
	 * @param {string} event.key - storage item that changed
	 * @private
	 * @memberOf Background
	 */
	function _onStorageChanged(event) {
		if (event.key === 'storageDuration') {
			_updateAlarms();
		}
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

		app.User.setInfo();
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
			return app.SW.initialize().catch(function(error) {});
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Set the repeating alarms
	 * @private
	 * @memberOf Background
	 */
	function _updateAlarms() {
		const durationType = app.Utils.get('storageDuration');
		if (durationType === 4) {
			// until room is needed
			chrome.alarms.clear(ALARM_STORAGE);
		} else {
			// Add daily alarm to delete old clipItems
			chrome.alarms.get(ALARM_STORAGE, function(alarm) {
				if (!alarm) {
					chrome.alarms.create(ALARM_STORAGE, {
						when: Date.now() + app.Utils.MILLIS_IN_DAY,
						periodInMinutes: app.Utils.MIN_IN_DAY,
					});
				}
			});
		}
	}

	/**
	 * Delete {@link ClipItem} objects older than the storageDuration setting
	 * @private
	 * @memberOf Background
	 */
	function _deleteOldClipItems() {
		app.ClipItem.deleteOld();
	}

	/**
	 * Process received push notifications
	 * @param {GaeMsg} data - push data
	 * @private
	 * @memberOf Background
	 */
	function _handleMessageReceived(data) {
		const deviceModel = data.dM;
		const deviceSN = data.dSN;
		const deviceOS = data.dOS;
		const deviceNickname = data.dN;
		const device = new app.Device(deviceModel, deviceSN, deviceOS,
			deviceNickname, Date.now());

		if (device.isMe()) {
			// don't handle our messages
			return;
		}

		if (data.act === app.Msg.ACTION_MESSAGE) {
			// Remote ClipItem
			app.Devices.add(device);
			const fav = (data.fav === '1');
			// Persist
			app.ClipItem.add(data.message, Date.now(), fav, true,
				device.getName());
			// save to clipboard
			_copyToClipboard(data.message);
		} else if (data.act === app.Msg.ACTION_PING) {
			// we were pinged
			app.Devices.add(device);
			// send response
			app.Msg.sendPingResponse().catch(function(error) {
				_sendMessageFailed(error);
			});
		} else if (data.act === app.Msg.ACTION_PING_RESPONSE) {
			// someone is around
			app.Devices.add(device);
		} else if (data.act === app.Msg.ACTION_DEVICE_ADDED) {
			// someone new is here
			app.Devices.add(device);
		} else if (data.act === app.Msg.ACTION_DEVICE_REMOVED) {
			// someone went away
			app.Devices.remove(device);
		}
	}

	/**
	 * Get the text from the clipboard
	 * @return {string} text from clipboard
	 * @private
	 * @memberOf Background
	 */
	function _getTextFromClipboard() {
		const input = document.createElement('textArea');
		document.body.appendChild(input);
		input.focus();
		input.select();
		document.execCommand('Paste');
		const text = input.value;
		input.remove();

		return text;
	}

	/**
	 * Copy the given text to the clipboard
	 * @param {string} text - text to copy
	 * @private
	 * @memberOf Background
	 */
	function _copyToClipboard(text) {
		const input = document.createElement('textArea');
		document.body.appendChild(input);
		input.textContent = text;
		input.focus();
		input.select();
		document.execCommand('Copy');
		input.remove();
	}

	/**
	 * Send local {@link ClipItem} push notification if enabled
	 * @param {ClipItem} clipItem - {@link ClipItem} to send
	 * @private
	 * @memberOf Background
	 */
	function _sendLocalClipItem(clipItem) {
		if (!clipItem.remote && app.Utils.isRegistered() &&
			app.Utils.allowPush() && app.Utils.isAutoSend()) {
			// send to our devices
			app.Msg.sendClipItem(clipItem).catch(function(error) {
				_sendMessageFailed(error);
			});
		}
	}

	/**
	 * Add a new {@link ClipItem} from the Clipboard contents
	 * @private
	 * @memberOf Background
	 */
	function _addClipItemFromClipboard() {
		if (!app.Utils.isMonitorClipboard()) {
			return;
		}

		// wait a little to make sure clipboard is ready
		setTimeout(function() {
			// get the clipboard contents
			const text = _getTextFromClipboard();
			if (app.Utils.isWhiteSpace(text)) {
				return;
			}

			// Persist
			app.ClipItem.add(text, Date.now(), false, false,
				app.Device.myName()).then(function(clipItem) {
				// send to our devices
				_sendLocalClipItem(clipItem);
			});

		}, CLIPBOARD_WAIT_MILLIS);
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
		}, function(response) {
			if (!response) {
				// no one listening, create it
				chrome.tabs.create({url: '../html/main.html'});
			}
		});
	}

	/**
	 * Notify listeners that send message failed
	 * @param {Error} error - what caused the failure
	 * @private
	 * @memberOf Background
	 */
	function _sendMessageFailed(error) {
		let err = error;
		if (error.message) {
			err = error.message;
		}
		chrome.runtime.sendMessage({
			message: 'sendMessageFailed',
			error: err,
		}, function() {});
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

	/**
	 * Listen for alarms
	 */
	chrome.alarms.onAlarm.addListener(_onAlarm);

	/**
	 * Listen for web requests
	 */
	chrome.webRequest.onBeforeRequest.addListener(_onWebRequestBefore,
		{
			urls: ['http://www.anyoldthing.com/*'],
		}, ['blocking']);

	/**
	 * Listen for changes to localStorage
	 */
	addEventListener('storage', _onStorageChanged, false);

})(document);
