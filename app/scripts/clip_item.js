/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
(function(window) {
  'use strict';

  new ExceptionHandler();

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
   * The Dexie database
   * @see http://dexie.org/
   * @type {Object}
   * @private
   * @memberOf ClipItem
   */
  let _db;

  /**
   * The Dexie database version
   * @const
   * @type {int}
   * @private
   * @memberOf ClipItem
   */
  const VERSION = 1;

  /**
   * Error indicating that {@link ClipItem} text is null or all whitespace
   * @const
   * @type {string}
   */
  ClipItem.ERROR_EMPTY_TEXT = 'Text is only whitespace';

  /**
   * Error indicating that the database is full
   * @const
   * @type {string}
   */
  ClipItem.ERROR_DB_FULL = 'Database is full. Please delete unused items.';

  /**
   * Error indicating there were no non favorites to delete
   * @const
   * @type {string}
   */
  ClipItem.ERROR_REMOVE_FAILED = 'Failed to delete item(s).';

  /**
   * Set date
   * @param {int} date - millis from epoch
   */
  ClipItem.prototype.setDate = function(date) {
    this.date = date;
  };

  /**
   * Get fav
   * @returns {boolean} fav
   */
  ClipItem.prototype.getFav = function() {
    return this.fav;
  };

  /**
   * Set favorite
   * @param {boolean} fav - is item a favorite
   */
  ClipItem.prototype.setFav = function(fav) {
    this.fav = fav;
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
   * @returns {Promise<string>} primary key it was stored under
   */
  ClipItem.prototype.save = function() {
    if (Chrome.Utils.isWhiteSpace(this.text)) {
      return Promise.reject(new Error(ClipItem.ERROR_EMPTY_TEXT));
    }
    return this._safeSave();
  };

  let counter = 0; // todo delete

  /**
   * Put to database or delete oldest non favorite
   * @returns {Promise<string>} primary key it was stored under
   */
  ClipItem.prototype._putOrDeleteOldest = function() {
    return _db.clipItems.put(this).then((key) => {
      // todo delete if block
      if (counter < 5) {
        counter++;
        return ClipItem.remove(this.text).then(() => {
          throw new Dexie.QuotaExceededError('quota');
        });
      }
      return Promise.resolve(key);
    }).catch((err) => {
      if (err.name === 'QuotaExceededError') {
        // failed to save, delete oldest non-fav item
        return ClipItem._deleteOldest();
      } else {
        // some other error
        throw err;
      }
    }).catch((err) => {
      const msg = err.message;
      if (msg === ClipItem.ERROR_REMOVE_FAILED) {
        // nothing to delete, give up
        throw new Error(ClipItem.ERROR_DB_FULL);
      } else {
        // some other error
        throw err;
      }
    });
  };

  /**
   * Save to storage, deleting old items if needed
   * @returns {Promise<string>} primary key it was stored under
   */
  ClipItem.prototype._safeSave = function() {
    if (Chrome.Utils.isWhiteSpace(this.text)) {
      throw new Error(ClipItem.ERROR_EMPTY_TEXT);
    }

    const self = this;
    const MAX_DELETES = 100;
    let retKey = '';

    /**
     * Repeat the call to {@link ClipItem._putOrDeleteOldest} up to count
     * equals 0
     * @param {int} count - track number of calls
     * @returns {Promise<void>} void
     */
    function repeatFunction(count) {
      if (count === 0) {
        throw new Error(ClipItem.ERROR_DB_FULL);
      }
      return self._putOrDeleteOldest().then(function(key) {
        retKey = key;
        if (retKey) {
          return Promise.resolve();
        }
        return repeatFunction(count - 1);
      });
    }

    return _db.transaction('rw', _db.clipItems, () => {
      return repeatFunction(MAX_DELETES);
    }).then(() => {
      return Promise.resolve(retKey);
    }).catch((err) => {
      console.log('transaction failed.');
      console.error(err);
      // eslint-disable-next-line promise/no-nesting
      Chrome.Msg.send(app.ChromeMsg.RELOAD_DB).catch(() => {});
      // todo throw new Error(ClipItem.ERROR_DB_FULL);
      throw err;
    });
  };

  /**
   * Determine if {@link ClipItem} text exists in storage
   * @returns {Promise<boolean>} true if text exists
   */
  ClipItem.prototype.exists = function() {
    return _db.clipItems.get(this.text).then((item) => {
      return Promise.resolve((item !== undefined));
    });
  };

  /**
   * Add new {@link ClipItem} to storage
   * @param {string} text - The text of the clip
   * @param {int} date - Time in milliSecs from epoch
   * @param {boolean} fav - true if this has been marked as a favorite
   * @param {boolean} remote - true if this came from a device other than ours
   * @param {string} device - A String representing the source device
   * @returns {Promise<ClipItem>} A new {@link ClipItem}
   */
  ClipItem.add = function(text, date, fav, remote, device) {
    let updated;
    const clipItem = new ClipItem(text, date, fav, remote, device);
    return clipItem.exists().then((isTrue) => {
      updated = isTrue;
      return clipItem.save();
    }).then(() => {
      // let listeners know a ClipItem was added or updated
      const msg = app.ChromeMsg.CLIP_ADDED;
      msg.item = clipItem;
      msg.updated = updated;
      // eslint-disable-next-line promise/no-nesting
      Chrome.Msg.send(msg).catch(() => {});
      return Promise.resolve(clipItem);
    });
  };

  /**
   * Remove the given keys from storage
   * @param {string|string[]} keys - array of keys to delete
   * @returns {Promise<void>} void
   */
  ClipItem.remove = function(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return _db.clipItems.bulkDelete(keyArray);
  };

  /**
   * Return true is there are no stored {@link ClipItem} objects
   * @returns {Promise<boolean>} true if no {@link ClipItem} objects
   */
  ClipItem.isEmpty = function() {
    return _db.clipItems.count().then((count) => {
      return Promise.resolve(!count);
    });
  };

  /**
   * Return all the {@link ClipItem} objects from storage
   * @returns {Promise<Array>} Array of {@link ClipItem} objects
   */
  ClipItem.loadAll = function() {
    return _db.clipItems.toArray();
  };

  /**
   * Delete items older than the storageDuration setting
   * @returns {Promise<boolean>} true if items were deleted
   */
  ClipItem.deleteOld = function() {
    const durIndex = Chrome.Storage.getInt('storageDuration', 2);
    const durations = [
      app.Utils.MILLIS_IN_DAY,
      app.Utils.MILLIS_IN_DAY * 7,
      app.Utils.MILLIS_IN_DAY * 30,
      app.Utils.MILLIS_IN_DAY * 365,
    ];

    if (durIndex === 4) {
      // store forever
      return Promise.resolve(false);
    } else {
      const olderThanTime = Date.now() - durations[durIndex];
      return ClipItem._deleteOlderThan(olderThanTime);
    }
  };

  /**
   * Delete non-favorite {@link ClipItem} objects older than the given time
   * @param {int} time - time in millis since epoch
   * @returns {Promise<boolean>} true if items were deleted
   * @private
   */
  ClipItem._deleteOlderThan = function(time) {
    return _db.clipItems.where('date').below(time).filter(function(clipItem) {
      return !clipItem.fav;
    }).delete().then((deleteCount) => {
      return Promise.resolve(!!deleteCount);
    });
  };

  /**
   * Delete the oldest non favorite
   * @returns {Promise<void>} void
   */
  ClipItem._deleteOldest = function() {
    let clipItem = null;
    return ClipItem.loadAll().then((clipItems) => {
      let found = false;
      if (!clipItems) {
        throw new Error(ClipItem.ERROR_REMOVE_FAILED);
      }
      clipItems.sort((a, b) => {
        return a.date - b.date;
      });
      for (let i = 0; i < clipItems.length; i++) {
        clipItem = clipItems[i];
        if (!clipItem.fav) {
          found = true;
          break;
        }
      }
      if (found) {
        return ClipItem.remove(clipItem.text);
      } else {
        throw new Error(ClipItem.ERROR_REMOVE_FAILED);
      }
    }).then(() => {
      // let listeners know a ClipItem was removed
      // todo copy interface won't get this
      // todo stupid not sending msg to source window
      const msg = app.ChromeMsg.CLIP_REMOVED;
      msg.item = clipItem;
      // eslint-disable-next-line promise/no-nesting
      Chrome.Msg.send(msg).catch(() => {});
      return Promise.resolve();
    });
  };

  /**
   * Event: called when document and resources are loaded<br />
   * Initialize Dexie
   * @private
   * @memberOf ClipItem
   */
  function _onLoad() {
    _db = new Dexie('ClipItemsDB');

    // define database
    _db.version(VERSION).stores({
      clipItems: '&text,date',
    });

    _db.clipItems.mapToClass(ClipItem);
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  window.app = window.app || {};
  window.app.ClipItem = ClipItem;
})(window);
