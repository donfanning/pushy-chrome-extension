/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage the chrome.alarm
 * @namespace
 */
app.Alarm = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * Alarm for cleaning up old {@link ClipItem} objects
	 * @type {string}
	 * @const
	 * @default
	 * @private
	 * @memberOf Alarm
	 */
	const ALARM_STORAGE = 'storage';

	/**
	 * Event: Fired when an alarm has elapsed.
	 * @see https://developer.chrome.com/apps/alarms#event-onAlarm
	 * @param {Object} alarm - details on alarm
	 * @private
	 * @memberOf Alarm
	 */
	function _onAlarm(alarm) {
		if (alarm.name === ALARM_STORAGE) {
			app.Alarm.deleteOldClipItems();
		}
	}

	/**
	 * Event: Fired when item in localStorage changes
	 * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
	 * @param {Event} event - storage event
	 * @param {string} event.key - storage item that changed
	 * @private
	 * @memberOf Alarm
	 */
	function _onStorageChanged(event) {
		if (event.key === 'storageDuration') {
			app.Alarm.updateAlarms();
		}
	}

	/**
	 * Listen for alarms
	 */
	chrome.alarms.onAlarm.addListener(_onAlarm);

	/**
	 * Listen for changes to localStorage
	 */
	addEventListener('storage', _onStorageChanged, false);

	return {
		/**
		 * Set the repeating alarms
		 * @memberOf Alarm
		 */
		updateAlarms: function() {
			const durationType = app.Utils.getInt('storageDuration');
			if (durationType === 4) {
				// until room is needed
				chrome.alarms.clear(ALARM_STORAGE);
			} else {
				// Add daily alarm to delete old clipItems
				chrome.alarms.get(ALARM_STORAGE, (alarm) => {
					if (!alarm) {
						chrome.alarms.create(ALARM_STORAGE, {
							when: Date.now() + app.Utils.MILLIS_IN_DAY,
							periodInMinutes: app.Utils.MIN_IN_DAY,
						});
					}
				});
			}
		},

		/**
		 * Delete {@link ClipItem} objects older than the
		 * storageDuration setting
		 * @memberOf Alarm
		 */
		deleteOldClipItems: function() {
			app.ClipItem.deleteOld().catch((error) => {});
		},
	};
})();


