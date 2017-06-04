/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle display of notifications
 *  @namespace
 */
app.Notify = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Send notification type
	 * @type {string}
	 * @default
	 * @const
	 * @private
	 * @memberOf app.Notify
	 */
	const NOTIFY_SEND = 'CLIP_MAN_SEND';

	/**
	 * Icons
	 * @type {{LOCAL_COPY: string,
	 * ADD_DEVICE: string,
	 * REMOVE_DEVICE: string}}
	 * @const
	 * @default
	 * @private
	 * @memberOf app.Notify
	 */
	const ICON = {
		LOCAL_COPY: '/images/ic_local_copy.png',
		ADD_DEVICE: '/images/ic_add_device.png',
		REMOVE_DEVICE: '/images/ic_remove_device.png',
	};

	/**
	 * Get the icon for the notification
	 * @param {GaeMsg} data message object
	 * @returns {?string} path to icon, null for
	 * actions without notifications (ping)
	 * @memberOf app.Notify
	 */
	function _getIcon(data) {
		let path = '';
		if (data.act === app.Msg.ACTION.MESSAGE) {
			path = ICON.LOCAL_COPY;
		} else if (data.act === app.Msg.ACTION.DEVICE_ADDED) {
			path = ICON.ADD_DEVICE;
		} else if (data.act === app.Msg.ACTION.DEVICE_REMOVED) {
			path = ICON.REMOVE_DEVICE;
		}
		return path;
	}

	/**
	 * Event: Fired when the user clicked in a non-button area
	 * of the notification.
	 * @see https://developer.chrome.com/apps/notifications#event-onClicked
	 * @param {string} id - notification type
	 * @private
	 * @memberOf app.Notify
	 */
	function _onNotificationClicked(id) {
		app.Notify.showMainTab();
		chrome.notifications.clear(id, () => {});
	}

	// Listen for click on our notifications
	chrome.notifications.onClicked.addListener(_onNotificationClicked);

	return {
		/**
		 * Send notification type
		 * @memberOf app.Notify
		 */
		NOTIFY_SEND: NOTIFY_SEND,

		/**
		 * Create and display a notification
		 * @param {string} type - notification type (send or receive)
		 * @param {GaeMsg} data - message data
		 * @memberOf app.Notify
		 */
		create: function(type, data) {
			const options = {
				type: 'basic',
				title: 'Pushy',
				isClickable: true,
				eventTime: Date.now(),
			};
			const icon = _getIcon(data);
			if (!icon) {
				// skip ping messages
				return;
			}

			chrome.notifications.getPermissionLevel(function(level) {
				if (level === 'granted') {
					switch (type) {
						case NOTIFY_SEND:
							options.iconUrl = chrome.runtime.getURL(icon);
							options.title = 'Sent push message';
							options.message = data.m;
							chrome.notifications
								.create(type, options, () => {});
							break;
						default:
							break;
					}
				}
			});
		},

		/**
		 * Determine if send notifications are enabled
		 * @returns {boolean} true if enabled
		 * @memberOf app.Notify
		 */
		onSend: function() {
			const notify = app.Storage.getBool('notify');
			const notifyOnSend = app.Storage.getBool('notifyOnSend');
			return notify && notifyOnSend;
		},

		/**
		 * Send message to the main tab to focus it. If not found, create it
		 * @memberOf app.Notify
		 */
		showMainTab: function() {
			chrome.runtime.sendMessage({
				message: 'highlightTab',
			}, (response) => {
				if (!response) {
					// no one listening, create it
					chrome.tabs.create({url: '../html/main.html'});
				}
			});
		},
	};
})();