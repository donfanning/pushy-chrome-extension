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
(function(window) {
	'use strict';

	/**
	 * Creates a new Device instance.
	 * @constructor
	 * @alias Device
	 * @param {string} model The model name of a device
	 * @param {string} sn The serial number (or other descriptor) of a device
	 * @param {string} os The operating system of a device
	 * @param {string} nickname The nickname of a device
	 * @param {int} lastSeen A date in millis from the epoch
	 */
	const Device = function(model, sn, os, nickname, lastSeen) {
		this.model = model;
		this.sn = sn;
		this.os = os;
		this.nickname = nickname;
		if (lastSeen) {
			this.lastSeen = lastSeen;
		} else {
			this.lastSeen = Date.now();
		}
	};

	/**
	 * Get a String that uniquely (hopefully) determines this {@link Device}*
	 * @return {string} unique name
	 */
	Device.prototype.getUniqueName = function() {
		return this.model + ' - ' + this.sn + ' - ' + this.os;
	};

	/**
	 * Get name suitable for display
	 * @return {string} descriptive name of {@link Device}
	 */
	Device.prototype.getName = function() {
		let name = this.nickname;
		if (app.Utils.isWhiteSpace(name)) {
			name = this.model + ' - ' + this.sn + ' - ' + this.os;
		}
		return name;
	};

	/**
	 * Determine if this is our {@link Device}
	 * @return {boolean} true if this is our {@link Device}
	 */
	Device.prototype.isMe = function() {
		return (this.getUniqueName() === Device.myUniqueName());
	};

	Device.MODEL = 'dM';
	Device.SN = 'dSN';
	Device.OS = 'dOS';
	Device.NICKNAME = 'dN';

	/**
	 * Get unique name of our {@link Device}
	 * @return {string} unique name
	 */
	Device.myUniqueName = function() {
		return Device.myModel() + ' - ' + Device.mySN() + ' - ' + Device.myOS();
	};

	/**
	 * Get display name of our {@link Device}
	 * @return {string} display name
	 */
	Device.myName = function() {
		let name = Device.myNickname();
		if (app.Utils.isWhiteSpace(name)) {
			name = Device.myModel() + ' - ' + Device.mySN() + ' - ' +
				Device.myOS();
		}
		return name;
	};

	/**
	 * Get model name of our {@link Device}
	 * @return {string} model name
	 */
	Device.myModel = function() {
		return 'Chrome';
	};

	/**
	 * Get serial number of our {@link Device}
	 * @return {string} serial number
	 */
	Device.mySN = function() {
		return app.Utils.get('deviceSN');
	};

	/**
	 * Get operating system of our {@link Device}
	 * @return {string} operating system
	 */
	Device.myOS = function() {
		return app.Utils.get('os');
	};

	/**
	 * Get os version of our {@link Device}
	 * @return {string} operating system version
	 */
	Device.myVersion = function() {
		return app.Utils.getChromeVersion();
	};

	/**
	 * Get nickname of our {@link Device}
	 * @return {string} nickname
	 */
	Device.myNickname = function() {
		return app.Utils.get('deviceNickname');
	};

	window.app = window.app || {};
	window.app.Device = Device;
})(window);
