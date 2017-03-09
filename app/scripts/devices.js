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
/** @namespace Devices */
app.Devices = (function() {
	'use strict';

	/**
	 * A Map of {@link Device} objects keyed by their unique names
	 *
	 * @type {Map}
	 * @alias Devices._devices
	 */
	let _devices = new Map();

	/**
	 * Convert Map to Object
	 *
	 * @param {Map} map a Map
	 * @return {Object} as Object
	 * @private
	 * @alias Devices._mapToObj
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
	 *
	 * @private
	 * @alias Devices._load
	 */
	function _load() {
		_devices = new Map();
		const json = app.Utils.get('devices');
		if (json) {
			for (let k in json) {
				if (json.hasOwnProperty(k)) {
					let v = json[k];
					let device =
						new app.Device(v.model, v.sn, v.os, v.nickname, v.lastSeen);
					_devices.set(k, device);
				}
			}
		}
	}

	/**
	 * Save the Devices to localStorage
	 *
	 * @private
	 * @alias Devices._save
	 */
	function _save() {
		app.Utils.set('devices', _mapToObj(_devices));
		// let listeners know we changed
		chrome.runtime.sendMessage({
			message: 'devicesChanged',
		}, function(response) {});
	}

	/**
	 * Event: called when document and resources are loaded
	 * Load the {@link Device} objects from localStorage
	 *
	 * @private
	 * @alias Devices._onLoad
	 */
	function _onLoad() {
		_load();
	}

	// listen for document and resources loaded
	window.addEventListener('load', _onLoad);

	return {

		/**
		 * Get an {@link Iterator} on the Devices
		 *
		 * @return {Iterator.<Device>}
		 * @alias Devices.entries
		 */
		entries: function() {
			return _devices.entries();
		},

		/**
		 * Add a new {@link Device}
		 *
		 * @param {Device} device Device to add
		 * @alias Devices.add
		 */
		add: function(device) {
			_devices.set(device.getUniqueName(), device);
			_save();
		},

		/**
		 * Remove a {@link Device}
		 *
		 * @param {Device} device Device to remove
		 * @alias Devices.remove
		 */
		remove: function(device) {
			this.removeByName(device.getUniqueName());
		},

		/**
		 * Remove a {@link Device} with the given unique name
		 *
		 * @param {String} uniqueName Name of Device to remove
		 * @alias Devices.removeByName
		 */
		removeByName: function(uniqueName) {
			_devices.delete(uniqueName);
			_save();
		},

		/**
		 * Remove all {@link Device} objects
		 *
		 * @alias Devices.clear
		 */
		clear: function() {
			_devices.clear();
			_save();
		},

	};

})();
