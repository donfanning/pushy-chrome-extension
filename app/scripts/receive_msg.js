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
app.ReceiveMsg = (function() {
	'use strict';

	/**
	 * Handle incoming push messages
	 * @namespace ReceiveMsg
	 */

	/**
	 * Delay time for fcm message processing
	 * @type {int}
	 * @default
	 * @memberOf ReceiveMsg
	 */
	const MESSAGE_WAIT_MILLIS = 500;

	/**
	 * Get new {@link Device} from {@link GaeMsg}
	 * @param {GaeMsg} data - push data
	 * @return {Device}
	 * @private
	 * @memberOf ReceiveMsg
	 */
	function _getDevice(data) {
		return new app.Device(data.dM, data.dSN, data.dOS, data.dN, Date.now());
	}

	/**
	 * Event: Fired when a request is about to occur.
	 * @see https://goo.gl/4j4RtY
	 * @param {object} details - details on the request
	 * @return {object} cancel the request
	 * @private
	 * @memberOf ReceiveMsg
	 */
	function _onWebRequestBefore(details) {
		const url = decodeURI(details.url);
		const regex = /http:\/\/www\.anyoldthing\.com\/\?(.*)/;
		const matches = url.match(regex);
		let text = matches[1];
		if (text) {
			const data = JSON.parse(text);
			if (data) {
				setTimeout(function() {
					// process message and slow down message stream
					app.ReceiveMsg.process(data);
				}, MESSAGE_WAIT_MILLIS);
			}
		}
		// cancel fake request
		return {cancel: true};
	}

	/**
	 * Listen for web requests
	 */
	chrome.webRequest.onBeforeRequest.addListener(_onWebRequestBefore,
		{
			urls: ['http://www.anyoldthing.com/*'],
		}, ['blocking']);

	return {

		/**
		 * Process received push notifications
		 * @param {GaeMsg} data - push data
		 * @memberOf ReceiveMsg
		 */
		process: function(data) {
			const device = _getDevice(data);
			if (device.isMe()) {
				// don't handle our messages
				return;
			}

			if (data.act === app.Msg.ACTION_MESSAGE) {
				// Remote ClipItem
				app.Devices.add(device);
				const fav = (data.fav === '1');
				// Persist
				app.ClipItem
					.add(data.m, Date.now(), fav, true, device.getName())
					.catch((error) => {});
				// save to clipboard
				app.CB.copyToClipboard(data.m);
			} else if (data.act === app.Msg.ACTION_PING) {
				// we were pinged
				app.Devices.add(device);
				app.Msg.sendPingResponse(data.srcRegId).catch((error) => {
					app.Gae.sendMessageFailed(error);
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
		},

	};

})();
