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
   * @property {int[]} labelsId - Array of label PK's
   */
  const ClipItem = function(text, date, fav, remote, device) {
    this.text = text;
    this.date = date;
    this.fav = fav;
    this.remote = remote;
    this.device = device;
    this.labelsId = [];
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
   * Error indicating Label add failed
   * @const
   * @type {string}
   */
  ClipItem.ERROR_ADD_LABEL = 'Failed to add Label.';

  /**
   * Error indicating Label remove failed
   * @const
   * @type {string}
   */
  ClipItem.ERROR_REMOVE_LABEL = 'Failed to remove Label.';

  /**
   * Error indicating Label id doesn't exist
   * @const
   * @type {string}
   */
  ClipItem._ERROR_NO_LABEL = 'Label not found.';

  /**
   * Get our labels
   * @returns {Promise<Label[]>} Array of {@link Label} objects
   */
  ClipItem.prototype.getLabels = function() {
    return app.DB.labels().where('_id').anyOf(this.labelsId).sortBy('name');
  };

  /**
   * Set our {@link Label} ids
   * @param {string[]} labelNames - names of labels
   * @returns {Promise<int>} our database PK
   */
  ClipItem.prototype.setLabels = function(labelNames) {
    labelNames = labelNames || [];
    return app.Label.loadAll().then((labels) => {
      labels = labels || [];
      this.labelsId = [];
      labels.forEach((label) => {
        if (labelNames.includes(label.name)) {
          this.labelsId.push(label._id);
        }
      });
      return this.save();
    });
  };
  
  /**
   * Do we contain a {@link Label}
   * @param {string} name - {@link Label} name
   * @returns {Promise<boolean>} true if we have Label
   */
  ClipItem.prototype.hasLabel = function(name) {
    const label = new app.Label(name);
    return label.getId().then((id) => {
      if (id && this.labelsId.includes(id)) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
  };

  /**
   * Add a label
   * @param {Label} label
   */
  ClipItem.prototype.addLabel = function(label) {
    label.getId().then((id) => {
      if (id) {
        this.labelsId.push(id);
        return this.save();
      }
      return Promise.reject(new Error(ClipItem._ERROR_NO_LABEL));
    }).catch((err) => {
      Chrome.Log.error(err.message, 'ClipItem.addLabel',
          ClipItem.ERROR_ADD_LABEL);
    });
  };

  /**
   * Remove a label
   * @param {Label} label
   */
  ClipItem.prototype.removeLabel = function(label) {
    label.getId().then((id) => {
      if (id) {
        const index = this.labelsId.indexOf(id);
        if (index !== -1) {
          this.labelsId.splice(index, 1);
          return this.save();
        }
      }
      return Promise.reject(new Error(ClipItem._ERROR_NO_LABEL));
    }).catch((err) => {
      Chrome.Log.error(err.message, 'ClipItem.removeLabel',
          ClipItem.ERROR_REMOVE_LABEL);
    });
  };

  /**
   * Save to the database
   * @returns {Promise<void>}
   */
  ClipItem.prototype.save = function() {
    return this._safeSave();
  };
  
  /**
   * Update the database
   * @param {Object} changes - properties to change
   * @returns {Promise<int>} number of properties changed
   */
  ClipItem.prototype.update = function(changes) {
    return app.DB.clips().update(this._id, changes);
  };

  /**
   * Add if new or update if existing
   * @returns {Promise<int>} database PK
   */
  ClipItem.prototype._addOrUpdate = function() {
    let updated = false;
    return this._getId().then((id) => {
      if (id) {
        updated = true;
        this._id = id;
        return app.DB.clips().update(id, this);
      } else {
        return app.DB.clips().add(this);
      }
    }).then((id) => {
      if (!updated) {
        this._id = id;
      }
      return Promise.resolve(this._id);
    });
  };

  /**
   * Save to the database or delete oldest non favorite if there is no room
   * @returns {Promise<int>} database PK if saved, nothing otherwise
   */
  ClipItem.prototype._saveOrDeleteOldest = function() {
    return this._addOrUpdate().catch((err) => {
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
   * Save to database, deleting old items if needed
   * @returns {Promise<void>}
   */
  ClipItem.prototype._safeSave = function() {
    if (Chrome.Utils.isWhiteSpace(this.text)) {
      throw new Error(ClipItem.ERROR_EMPTY_TEXT);
    }
    const MAX_DELETES = 100;

    /**
     * Repeat function call up to count equals 0
     * @param {int} count - track number of calls
     * @returns {Promise<void>}
     */
    const repeatFunc = ((count) => {
      if (count === 0) {
        throw new Error(ClipItem.ERROR_DB_FULL);
      }
      return this._saveOrDeleteOldest().then(function(key) {
        if (key) {
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
      return Promise.resolve();
    });
  };

  /**
   * Get our PK
   * @returns {Promise<int|null>} database PK or null if text not found
   */
  ClipItem.prototype._getId = function() {
    return app.DB.clips().where('text').equals(this.text).first((clipItem) => {
      if (clipItem !== undefined) {
        return Promise.resolve(clipItem._id);
      }
      return Promise.resolve(null);
    });
  };

  /**
   * Get the {@link ClipItem} from the database
   * @param {string} text - The text of the clip
   * @returns {Promise<ClipItem|undefined>} A new {@link ClipItem},
   * undefined if not found
   */
  ClipItem.get = function(text) {
    return app.DB.clips().where('text').equals(text).first();
  };

  /**
   * Add new {@link ClipItem} to storage
   * @param {string} text - The text of the clip
   * @param {int} date - Time in milliSecs from epoch
   * @param {boolean} fav - true if this has been marked as a favorite
   * @param {boolean} remote - true if this came from a device other than ours
   * @param {string} device - A String representing the source device
   * @param {boolean} [keepFav=false] - if true don't override fav if it is true
   * @returns {Promise<ClipItem>} A new {@link ClipItem}
   */
  ClipItem.add = function(text, date, fav, remote, device, keepFav = false) {
    const clipItem = new ClipItem(text, date, fav, remote, device);
    if (keepFav) {
      // make sure fav stays true
      return ClipItem.get(text).then((clip) => {
        if ((clip !== undefined) && clip.fav) {
          clipItem.fav = true;
        }
        return clipItem.save();
      }).then((id) => {
        clipItem._id = id;
        return Promise.resolve(clipItem);
      });
    } else {
      return clipItem.save().then((id) => {
        clipItem._id = id;
        return Promise.resolve(clipItem);
      });
    }
  };

  /**
   * Remove the given keys from the database
   * @param {int|int[]} keys - array of PK's to delete
   * @returns {Promise<void>}
   */
  ClipItem.remove = function(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return app.DB.clips().bulkDelete(keyArray);
  };

  /**
   * Is the database table empty
   * @returns {Promise<boolean>} true if no {@link ClipItem} objects
   */
  ClipItem.isTableEmpty = function() {
    return app.DB.clips().count().then((count) => {
      return Promise.resolve(!count);
    });
  };

  /**
   * Return all the {@link ClipItem} objects from storage
   * @param {string} [labelName=''] - optional {@link Label} name
   * to filter on
   * @returns {Promise<ClipItem[]>}
   */
  ClipItem.loadAll = function(labelName = '') {
    if (labelName) {
      const label = new app.Label(labelName);
      return label.getId().then((id) => {
        if (id) {
          // filter by label
          return app.DB.clips().where('labelsId').equals(id).sortBy('date');
        } else {
          return app.DB.clips().orderBy('date').toArray();
        }
      });
    } else {
      return app.DB.clips().orderBy('date').toArray();
    }
  };
    
  /**
   * Remove the given {@link Label} PK from all {@link ClipItem} objects
   * @param {int} labelId - Label PK to delete
   */
  ClipItem.removeLabel = function(labelId) {
    app.DB.get().transaction('rw', app.DB.clips(), () => {
      ClipItem.loadAll().then((clipItems) => {
        clipItems = clipItems || [];
        const changedClipItems = [];
        clipItems.forEach((clipItem) => {
          const index = clipItem.labelsId.indexOf(labelId);
          if (index !== -1) {
            clipItem.labelsId.splice(index, 1);
            changedClipItems.push(clipItem);
          }
        });
        return Promise.resolve(changedClipItems);
      }).then((clipItems) => {
        clipItems = clipItems || [];
        clipItems.forEach((clipItem) => {
          clipItem.save();
        });
        return Promise.resolve();
      }).catch((err) => {
        return Promise.reject(err);
      });
    }).catch((err) => {
      Chrome.Log.error(err.message, 'ClipItem.removeLabel',
          'Failed to remove label from Clip Items.');
    });
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
    return app.DB.clips().where('date').below(time).filter((clipItem) => {
      return !clipItem.fav;
    }).delete().then((deleteCount) => {
      return Promise.resolve(!!deleteCount);
    });
  };

  /**
   * Delete the oldest non favorite
   * @returns {Promise<void>}
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
      return Promise.resolve();
    });
  };

  window.app = window.app || {};
  window.app.ClipItem = ClipItem;
})(window);
