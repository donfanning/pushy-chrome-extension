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
app.Msg = (function() {
	'use strict';

	/**
	 * Send messages to the gae server MessagingEndpoint for delivery
	 * @namespace Msg
	 */

	/**
	 * Base path of MessagingEndpoint
	 * @const
	 * @private
	 * @memberOf Msg
	 */
	const URL_BASE = `${app.Gae.GAE_ROOT}/messaging/v1/send/`;

	/**
	 * Max message length. Server may reduce it more
	 * @const
	 * @default
	 * @private
	 * @memberOf Msg
	 */
	const MAX_MSG_LEN = 4096;

	/**
	 * Message action
	 * @type {{MESSAGE: string,
	 * PING: string,
	 * PING_RESPONSE: string,
	 * DEVICE_ADDED: string,
	 * DEVICE_REMOVED: string}}
	 * @const
	 * @default
	 * @memberOf Msg
	 */
	const ACTION = {
		MESSAGE: 'm',
		PING: 'ping_others',
		PING_RESPONSE: 'respond_to_ping',
		DEVICE_ADDED: 'add_our_device',
		DEVICE_REMOVED: 'remove_our_device',
	};

	/**
	 * Message body
	 * @type {{PING: string,
	 * PING_RESPONSE: string,
	 * DEVICE_ADDED: string,
	 * DEVICE_REMOVED: string}}
	 * @const
	 * @default
	 * @private
	 * @memberOf Msg
	 */
	const MSG = {
		PING: 'Contacting other devices...',
		PING_RESPONSE: 'Device is online',
		DEVICE_ADDED: 'New device added',
		DEVICE_REMOVED: 'Device removed',
	};

	/**
	 * Data packet sent to server
	 * @typedef {Object} GaeMsg
	 * @property {string} act - type of message
	 * @property {string} m - content of message
	 * @property {string} dM - {@link Device} model
	 * @property {string} dSN - {@link Device} serial number
	 * @property {string} dOS - {@link Device} operating system
	 * @property {string} dN - {@link Device} nickname
	 * @property {string} fav - '1' if favorite item (optional)
	 * @property {string} srcRegId - source of ping (optional)
	 */

	/**
	 * Get the data packet we will send
	 * @param {string} action - message type
	 * @param {string} message - message content
	 * @return {GaeMsg} data packet
	 * @private
	 * @memberOf Msg
	 */
	function _getData(action, message) {
		const msg = _getDevice();
		msg.act = action;
		msg.m = message;
		return msg;
	}

	/**
	 * Get portion of {@link Device} sent in message
	 * @return {{}} Subset of {@link Device} info as object literal
	 * @memberOf Msg
	 */
	function _getDevice() {
		return {
			[app.Device.MODEL]: app.Device.myModel(),
			[app.Device.SN]: app.Device.mySN(),
			[app.Device.OS]: app.Device.myOS(),
			[app.Device.NICKNAME]: app.Device.myNickname(),
		};
	}

	/**
	 * Send message to server for delivery to our {@link Devices}
	 * @param {GaeMsg} data - data packet
	 * @param {boolean} notify - display notification if true
	 * @return {Promise<void>}
	 * @private
	 * @memberOf Msg
	 */
	function _sendMessage(data, notify) {
		if (!app.Utils.isSignedIn() || !app.Utils.allowPush()) {
			return Promise.resolve();
		}

		let url;
		return app.Fb.getRegToken().then((regId) => {
			const json = encodeURIComponent(JSON.stringify(data));
			const highPriority = app.Utils.get('highPriority');
			url = `${URL_BASE}${regId}/${json}/${highPriority}`;
			return app.User.getAuthToken(true);
		}).then((token) => {
			return app.Gae.doPost(url, token, true);
		}).then(() => {
			if (notify && app.Notify.onSend()) {
				app.Notify.create(app.Notify.NOTIFY_SEND, data);
			}
			app.GA.event(app.GA.SENT);
			return Promise.resolve();
		});
	}

	return {

		ACTION: ACTION,

		/**
		 * Send clipboard contents as represented by a {@link ClipItem}
		 * @param {ClipItem} clipItem - contents of clipboard
		 * @return {Promise<void>}
		 * @memberOf Msg
		 */
		sendClipItem: function(clipItem) {
			if (app.Utils.isWhiteSpace(clipItem.text)) {
				return Promise.resolve();
			}

			let text = clipItem.text;
			if (text.length > MAX_MSG_LEN) {
				// limit message size. Server may limit more
				text = text.substring(0, MAX_MSG_LEN - 1);
			}

			const data = _getData(ACTION.MESSAGE, text);
			data.FAV = clipItem.fav ? '1' : '0';
			return _sendMessage(data, true);
		},

		/**
		 * Send message for adding our {@link Device}
		 * @return {Promise<void>}
		 * @memberOf Msg
		 */
		sendDeviceAdded: function() {
			const data = _getData(ACTION.DEVICE_ADDED, MSG.DEVICE_ADDED);
			return _sendMessage(data, true);
		},

		/**
		 * Send message for removing our {@link Device}
		 * @return {Promise<void>}
		 * @memberOf Msg
		 */
		sendDeviceRemoved: function() {
			const data = _getData(ACTION.DEVICE_REMOVED, MSG.DEVICE_REMOVED);
			return _sendMessage(data, true);
		},

		/**
		 * Ping our {@link Devices}
		 * @return {Promise<void>}
		 * @memberOf Msg
		 */
		sendPing: function() {
			const data = _getData(ACTION.PING, MSG.PING);
			return _sendMessage(data, false);
		},

		/**
		 * Respond to a ping from one of our {@link Devices}
		 * @param {string} srcRegId - source of ping
		 * @return {Promise<void>}
		 * @memberOf Msg
		 */
		sendPingResponse: function(srcRegId) {
			const data = _getData(ACTION.PING_RESPONSE, MSG.PING_RESPONSE);
			data.srcRegId = srcRegId;
			return _sendMessage(data, false);
		},
	};
})();
