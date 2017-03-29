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
app.CB = (function() {
	'use strict';

	/**
	 * Manage the clipboard
	 * @namespace CB
	 */

	/**
	 * Delay time for reading from clipboard
	 * @type {int}
	 * @default
	 * @private
	 * @memberOf CB
	 */
	const WAIT_MILLIS = 250;

	/**
	 * Send local {@link ClipItem} push notification if enabled
	 * @param {ClipItem} clipItem - {@link ClipItem} to send
	 * @private
	 * @memberOf CB
	 */
	function _sendLocalClipItem(clipItem) {
		if (!clipItem.remote && app.Utils.isAutoSend()) {
			// send to our devices
			app.Msg.sendClipItem(clipItem).catch((error) => {
				app.Gae.sendMessageFailed(error);
			});
		}
	}

	/**
	 * Add a new {@link ClipItem} from the Clipboard contents
	 * @private
	 * @memberOf CB
	 */
	function _addClipItemFromClipboard() {
		if (!app.Utils.isMonitorClipboard()) {
			return;
		}

		// wait a little to make sure clipboard is ready
		setTimeout(function() {
			// get the clipboard contents
			const text = app.CB.getTextFromClipboard();
			if (app.Utils.isWhiteSpace(text)) {
				return;
			}

			// Persist
			app.ClipItem.add(text, Date.now(), false, false,
				app.Device.myName()).then((clipItem) => {
				// send to our devices
				_sendLocalClipItem(clipItem);
			}).catch((error) => {});

		}, WAIT_MILLIS);
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
	 * @memberOf CB
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
			app.CB.copyToClipboard(clipItem.text);
			_sendLocalClipItem(clipItem);
		}
		return ret;
	}

	/**
	 * Listen for Chrome messages
	 */
	chrome.runtime.onMessage.addListener(_onChromeMessage);

	return {
		/**
		 * Get the text from the clipboard
		 * @return {string} text from clipboard
		 * @memberOf CB
		 */
		getTextFromClipboard: function() {
			const input = document.createElement('textArea');
			document.body.appendChild(input);
			input.focus();
			input.select();
			document.execCommand('Paste');
			const text = input.value;
			input.remove();

			return text;
		},

		/**
		 * Copy the given text to the clipboard
		 * @param {string} text - text to copy
		 * @memberOf CB
		 */
		copyToClipboard: function(text) {
			const input = document.createElement('textArea');
			document.body.appendChild(input);
			input.textContent = text;
			input.focus();
			input.select();
			document.execCommand('Copy');
			input.remove();
		},
	};

})();

