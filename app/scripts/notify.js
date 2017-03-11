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
app.Notify = (function() {
	'use strict';

	/**
	 * TODO remove receive done by service worker
	 * Handle display of notification
	 *  @namespace Notify
	 */

	const NOTIFY_RECEIVE = 'CLIP_MAN_RECEIVE';
	const NOTIFY_SEND = 'CLIP_MAN_SEND';

	const IC_LOCAL_COPY = '/images/ic_local_copy.png';
	const IC_ADD_DEVICE = '/images/ic_add_device.png';
	const IC_REMOVE_DEVICE = '/images/ic_remove_device.png';

	/**
	 * Get the icon for the notification
	 * @param {GaeMsg} data message object
	 * @return {String|null} path to icon, null for
	 * actions without notifications (ping based)
	 * @memberOf Notify
	 */
	function _getIcon(data) {
		let path = '';
		if (data.act === app.Msg.ACTION_MESSAGE) {
			path = IC_LOCAL_COPY;
		} else if (data.act === app.Msg.ACTION_DEVICE_ADDED) {
			path = IC_ADD_DEVICE;
		} else if (data.act === app.Msg.ACTION_DEVICE_REMOVED) {
			path = IC_REMOVE_DEVICE;
		}
		return path;
	}

	return {

		/**
		 * Receive notification type
		 * @memberOf Notify
		 */
		NOTIFY_RECEIVE: NOTIFY_RECEIVE,

		/**
		 * Send notification type
		 * @memberOf Notify
		 */
		NOTIFY_SEND: NOTIFY_SEND,

		/**
		 * Create and display a notification
		 * @param {string} type - notification type (send or receive)
		 * @param {GaeMsg} data - message data
		 * @param {string} deviceName - source {@link Device}
		 * @memberOf Notify
		 */
		create: function(type, data, deviceName) {
			const options = {
				type: 'basic',
				title: 'Clip Man',
				isClickable: true,
				eventTime: Date.now(),
			};
			const icon = _getIcon(data);
			if (!icon) {
				// skip ping messages
				return;
			}

			chrome.notifications.getPermissionLevel(function(level) {
				if (level !== 'granted') {
					return;
				}

				switch (type) {
					case NOTIFY_RECEIVE:
						options.iconUrl = chrome.runtime.getURL(icon);
						options.title = 'From - ' + deviceName;
						options.message = data.message;
						if (app.Utils.getChromeVersion(0) >= 50) {
							options.requireInteraction = true;
						}
						chrome.notifications.create(type, options, () => {});
						break;
					case NOTIFY_SEND:
						options.iconUrl = chrome.runtime.getURL(icon);
						options.title = 'Sent push message';
						options.message = data.message;
						chrome.notifications.create(type, options, () => {});
						break;
					default:
						break;
				}
			});
		},

		/**
		 * Determine if send notifications are enabled
		 * @return {Boolean} true if enabled
		 * @memberOf Notify
		 */
		onSend: function() {
			const notify = app.Utils.get('notify');
			const notifyOnSend = app.Utils.get('notifyOnSend');
			return notify && notifyOnSend;
		},

		/**
		 * Determine if receive notifications are enabled
		 * @return {Boolean} true if enabled
		 * @memberOf Notify
		 */
		onReceive: function() {
			const notify = app.Utils.get('notify');
			const notifyOnReceive = app.Utils.get('notifyOnReceive');
			return notify && notifyOnReceive;
		},

	};

})();
