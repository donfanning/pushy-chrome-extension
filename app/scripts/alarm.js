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
app.Alarm = (function() {
	'use strict';

	/**
	 * Manage the chrome.alarm
	 * @namespace Alarm
	 */

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
	 * @param {object} alarm - details on alarm
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
	 * @param {Event} event
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
			const durationType = app.Utils.get('storageDuration');
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


