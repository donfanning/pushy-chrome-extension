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
   * @property {int} _id - database PK
   */
  const ClipItem = function(text, date, fav, remote, device) {
    this.text = text;
    this.date = date;
    this.fav = fav;
    this.remote = remote;
    this.device = device;
  };

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
    return this._safeSave();
  };

  /**
   * Put to the database or delete oldest non favorite if there is no room
   * @returns {Promise<int>} database PK
   */
  ClipItem.prototype._putOrDeleteOldest = function() {
    return app.DB.clips().put(this).then((key) => {
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
      if (err.message === ClipItem.ERROR_REMOVE_FAILED) {
        // nothing to delete, give up
        err.message = ClipItem.ERROR_DB_FULL;
      }
      throw err;
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
    const MAX_DELETES = 100;
    let retKey = '';

    /**
     * Repeat function call up to count equals 0
     * @param {int} count - track number of calls
     * @returns {Promise<void>} void
     */
    const repeatFunc = ((count) => {
      if (count === 0) {
        throw new Error(ClipItem.ERROR_DB_FULL);
      }
      return this._putOrDeleteOldest().then(function(key) {
        retKey = key;
        if (retKey) {
          return Promise.resolve();
        }
        return repeatFunc(count - 1);
      }).catch((err) => {
        console.error(err);
        throw err;
      });
    });

    // perform the save
    return app.DB.get().transaction('rw', app.DB.clips(), () => {
      return repeatFunc(MAX_DELETES);
    }).then(() => {
      return Promise.resolve(retKey);
    }).catch((err) => {
      // eslint-disable-next-line promise/no-nesting
      Chrome.Msg.send(app.ChromeMsg.RELOAD_DB).catch(() => {});
      throw err;
    });
  };

  /**
   * Determine if {@link ClipItem} text exists in storage
   * @returns {Promise<boolean>} true if text exists
   */
  ClipItem.prototype.exists = function() {
    return app.DB.clips().where('text').equals(this.text).first((clipItem) => {
      return Promise.resolve((clipItem !== undefined));
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
   * @param {int|int[]} keys - array of primary keys to delete
   * @returns {Promise<void>} void
   */
  ClipItem.remove = function(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return app.DB.clips().bulkDelete(keyArray);
  };

  /**
   * Return true is there are no stored {@link ClipItem} objects
   * @returns {Promise<boolean>} true if no {@link ClipItem} objects
   */
  ClipItem.isEmpty = function() {
    return app.DB.clips().count().then((count) => {
      return Promise.resolve(!count);
    });
  };

  /**
   * Return all the {@link ClipItem} objects from storage
   * @returns {Promise<Array>} Array of {@link ClipItem} objects
   */
  ClipItem.loadAll = function() {
    return app.DB.clips().toArray();
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
    return app.DB.clips().where('date').below(time)
    .filter((clipItem) => {
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
      // Note: This will not be called if invoked by other than background.html
      const msg = app.ChromeMsg.CLIP_REMOVED;
      msg.item = clipItem;
      // eslint-disable-next-line promise/no-nesting
      Chrome.Msg.send(msg).catch(() => {});
      return Promise.resolve();
    });
  };
  
  window.app = window.app || {};
  window.app.ClipItem = ClipItem;
})(window);
