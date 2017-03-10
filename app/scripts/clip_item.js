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
	 * Create a new {@link ClipItem}
	 * @constructor
	 * @alias ClipItem
	 * @param {string} text - The text of the clip
	 * @param {int} date - Time in milliSecs from epoch
	 * @param {boolean} fav - true if this has been marked as a favorite
	 * @param {boolean} remote - true if this came from a device other than ours
	 * @param {string} device - A String representing the source device
	 */
	const ClipItem = function(text, date, fav, remote, device) {
		this.text = text;
		this.date = date;
		this.fav = fav;
		this.remote = remote;
		this.device = device;
	};

	/**
	 * Error indicating that {@link ClipItem.text} is null or all whitespace
	 * @const
	 * @default
	 * @type {string}
	 */
	ClipItem.ERROR_EMPTY_TEXT = 'Empty text';

	/**
	 * Set date
	 * @param {int} date - millis from epoch
	 */
	ClipItem.prototype.setDate = function(date) {
		this.date = date;
	};

	/**
	 * Set remote
	 * @param {boolean} remote - true if not from our {@link Device}
	 */
	ClipItem.prototype.setRemote = function(remote) {
		this.remote = remote;
	};

	/**
	 * Save ourselves to storage
	 * @return {Promise<void>}
	 */
	ClipItem.prototype.save = function() {
		if (app.Utils.isWhiteSpace(this.text)) {
			return Promise.reject(new Error(ClipItem.ERROR_EMPTY_TEXT));
		}

		const value = ClipItem._getStorable(this);
		const chromep = new ChromePromise();
		return chromep.storage.local.set({
			[this.text]: value,
		}).then(function() {
			return Promise.resolve();
		}).catch(function(error) {
			return Promise.reject(error);
		});
	};

	/**
	 * Remove ourselves from storage
	 * @return {Promise<void>}
	 */
	ClipItem.prototype.remove = function() {
		const chromep = new ChromePromise();
		return chromep.storage.local.remove(this.text).then(function() {
			return Promise.resolve();
		}).catch(function(error) {
			return Promise.reject(error);
		});
	};

	/**
	 * Add new {@link ClipItem} to storage
	 * @param {string} text - The text of the clip
	 * @param {int} date - Time in milliSecs from epoch
	 * @param {boolean} fav - true if this has been marked as a favorite
	 * @param {boolean} remote - true if this came from a device other than ours
	 * @param {string} device - A String representing the source device
	 * @return {Promise<ClipItem>} A new {@link ClipItem}
	 */
	ClipItem.add = function(text, date, fav, remote, device) {
		const clipItem = new ClipItem(text, date, fav, remote, device);
		return clipItem.save().then(function() {
			// let listeners know a ClipItem was added
			chrome.runtime.sendMessage({message: 'clipAdded'}, function() {});
		}).then(function() {
			return Promise.resolve(clipItem);
		}).catch(function(error) {
			return Promise.reject(error);
		});
	};

	/**
	 * Remove the given keys from storage
	 * @param {string[]} keys - array of keys to delete
	 * @return {Promise<void>}
	 */
	ClipItem.remove = function(keys) {
		const chromep = new ChromePromise();
		return chromep.storage.local.remove(keys).then(function() {
			return Promise.resolve();
		}).catch(function(error) {
			return Promise.reject(error);
		});
	};

	/**
	 * Return true is there are no stored {@link ClipItem} objects
	 * @return {Promise<boolean>} true if no {@link ClipItem} objects
	 */
	ClipItem.isEmpty = function() {
		const chromep = new ChromePromise();
		return chromep.storage.local.getBytesInUse().then(function(bytes) {
			return Promise.resolve(!bytes);
		}).catch(function(error) {
			return Promise.reject(error);
		});
	};

	/**
	 * This callback passes an array of<br>
	 *     {@link ClipItem} objects, or error on failure.
	 * @callback clipsCallback
	 * @param {string|null} error - description of failure
	 * @param {ClipItem[]} clips - array of {@link ClipItem} objects
	 * @memberOf ClipItem
	 */

	/**
	 * Return all the {@link ClipItem} objects from storage
	 * @param {clipsCallback} callback
	 */
	ClipItem.loadAll = function(callback) {
		callback = callback || function() {};

		chrome.storage.local.get(null, function(items) {
			if (chrome.runtime.lastError) {
				callback(chrome.runtime.lastError.message, null);
			} else {
				let array = [];
				for (let k in items) {
					if (items.hasOwnProperty(k)) {
						array.push(ClipItem._getNew(k, items[k]));
					}
				}
				callback(null, array);
			}
		});
	};

	/**
	 * Delete items older than the storageDuration setting
	 * @param {booleanCallback} callback - true if any items were deleted
	 */
	ClipItem.deleteOld = function(callback) {
		callback = callback || function() {};

		const durationType = app.Utils.get('storageDuration');
		if (durationType === 4) {
			// store forever
			callback(null, false);
			return;
		}

		let duration;
		if (durationType === 0) {
			duration = app.Utils.MILLIS_IN_DAY;
		} else if (durationType === 1) {
			duration = app.Utils.MILLIS_IN_DAY * 7;
		} else if (durationType === 2) {
			duration = app.Utils.MILLIS_IN_DAY * 30;
		} else if (durationType === 3) {
			duration = app.Utils.MILLIS_IN_DAY * 365;
		}
		const now = Date.now();
		const olderThanTime = now - duration;

		ClipItem._deleteOlderThan(olderThanTime, function(error, didDelete) {
			callback(error, didDelete);
		});
	};

	/**
	 * Delete non-favorite {@link ClipItem} objects older than the given time
	 * @param {int} time - time in millis since epoch
	 * @param {booleanCallback} callback - true if any items were deleted
	 * @private
	 */
	ClipItem._deleteOlderThan = function(time, callback) {
		callback = callback || function() {};

		let keys = [];

		ClipItem.loadAll(function(error, items) {
			for (let i = 0; i < items.length; i++) {
				const clipItem = items[i];
				if (!clipItem.fav && (clipItem.date <= time)) {
					keys.push(clipItem.text);
				}
			}
			if (keys.length) {
				app.ClipItem.remove(keys).then(function() {
					// let listeners know one or more ClipItems were deleted
					chrome.runtime.sendMessage({
						message: 'clipsDeleted',
					}, function() {});
					callback(null, true);
				});
			} else {
				callback(null, false);
			}
		});
	};

	/**
	 * The portion of a {@link ClipItem} that is persisted
	 * @typedef {Object} ClipItem.Storable
	 * @property {int} date - type of message
	 * @property {boolean} fav - text of message
	 * @property {boolean} remote - {@link Device} model
	 * @property {string} device - {@link Device} serial number
	 */

	/**
	 * Create a new {@link ClipItem} from a {@link ClipItem.Storable}
	 * @param {string} text - text of the new {@link ClipItem}
	 * @param {ClipItem.Storable} Storable
	 * @return {ClipItem}
	 * @private
	 */
	ClipItem._getNew = function(text, Storable) {
		return new ClipItem(text, Storable.date, Storable.fav,
			Storable.remote, Storable.device);
	};

	/**
	 * Create a {@link ClipItem.Storable} from a {@link ClipItem}
	 * @param {ClipItem} clipItem - clip to use
	 * @return {ClipItem.Storable} A new {@link ClipItem.Storable}
	 * @private
	 */
	ClipItem._getStorable = function(clipItem) {
		return {
			'date': clipItem.date,
			'fav': clipItem.fav,
			'remote': clipItem.remote,
			'device': clipItem.device,
		};
	};

	window.app = window.app || {};
	window.app.ClipItem = ClipItem;
})(window);
