/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * A list of remote {@link Device} objects we know about
 *  @namespace
 */
app.Devices = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * A Map of {@link Device} objects keyed by their unique names
	 * @type {Map}
	 * @memberOf app.Devices
	 */
	let _devices = new Map();

	/**
	 * Convert Map to Object
	 * @param {Map} map - a Map
	 * @returns {Object} as Object
	 * @private
	 * @memberOf app.Devices
	 */
	function _mapToObj(map) {
		let obj = Object.create(null);
		for (let [k, v] of map) {
			// We don’t escape the key '__proto__'
			// which can cause problems on older engines
			obj[k] = v;
		}
		return obj;
	}

	/**
	 * Get the {@link Device} objects from localStorage
	 * @private
	 * @memberOf app.Devices
	 */
	function _load() {
		_devices = new Map();
		const json = app.Storage.get('devices');
		if (!json) {
			return;
		}
		for (let k in json) {
			if (json.hasOwnProperty(k)) {
				let v = json[k];
				let device =
					new app.Device(v.model, v.sn, v.os, v.nickname, v.lastSeen);
				_devices.set(k, device);
			}
		}
	}

	/**
	 * Save the {@link Device} objects to localStorage
	 * @private
	 * @memberOf app.Devices
	 */
	function _save() {
		app.Storage.set('devices', _mapToObj(_devices));
		// let listeners know we changed
		chrome.runtime.sendMessage({
			message: 'devicesChanged',
		}, (response) => {});
	}

	/**
	 * Event: called when document and resources are loaded<br />
	 * Load the {@link Device} objects from localStorage
	 * @private
	 * @memberOf app.Devices
	 */
	function _onLoad() {
		_load();
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {Object} request - details for the message
	 * @param {Object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @returns {boolean} true if asynchronous
	 * @private
	 * @memberOf app.Devices
	 */
	function _onChromeMessage(request, sender, response) {
		let ret = false;

		if (request.message === 'removeDevice') {
			app.Devices.removeByName(request.deviceName);
		} else if (request.message === 'ping') {
			app.Msg.sendPing().catch((err) => {
				app.Gae.sendMessageFailed(err);
			});
		}
		return ret;
	}

	/**
	 * listen for document and resources loaded
	 */
	window.addEventListener('load', _onLoad);

	/**
	 * Listen for Chrome messages
	 */
	chrome.runtime.onMessage.addListener(_onChromeMessage);

	return {
		/**
		 * Get an {@link Iterator} on the Devices
		 * @returns {Iterator.<Device>} Iterator
		 * @memberOf app.Devices
		 */
		entries: function() {
			return _devices.entries();
		},

		/**
		 * Add a new {@link Device}
		 * @param {Device} device - {@link Device} to add
		 * @memberOf app.Devices
		 */
		add: function(device) {
			_devices.set(device.getUniqueName(), device);
			_save();
		},

		/**
		 * Remove a {@link Device}
		 * @param {Device} device - {@link Device} to remove
		 * @memberOf app.Devices
		 */
		remove: function(device) {
			this.removeByName(device.getUniqueName());
		},

		/**
		 * Remove a {@link Device} with the given unique name
		 * @param {string} uniqueName - Name of Device to remove
		 * @memberOf app.Devices
		 */
		removeByName: function(uniqueName) {
			_devices.delete(uniqueName);
			_save();
		},

		/**
		 * Remove all {@link Device} objects
		 * @memberOf app.Devices
		 */
		clear: function() {
			_devices.clear();
			_save();
		},
	};
})();