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
   * @param {labelsId[]} [labelsId=[]] - Array of {@Label} PK's
   * @param {Label[]} [labels=[]] - Array of {@Label} objects
   * @property {int} _id - database PK
   */
  const ClipItem = function(text, date, fav, remote, device,
                            labelsId = [], labels = []) {
    this.text = text;
    this.date = date;
    this.fav = fav;
    this.remote = remote;
    this.device = device;
    this.labelsId = labelsId;
    this.labels = labels;
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
   * Error indicating ClipItem doesn't exist
   * @const
   * @type {string}
   */
  ClipItem._ERROR_NO_CLIP = 'Clip item not found.';

  /**
   * Set our {@link Label} objects
   * @param {string[]} labelNames - names of labels
   * @returns {Promise<int>} our database PK
   */
  ClipItem.prototype.setLabels = function(labelNames) {
    labelNames = labelNames || [];
    return app.Label.loadAll().then((labels) => {
      labels = labels || [];
      this._clearLabels();
      labels.forEach((label) => {
        if (labelNames.includes(label.name)) {
          this._addLabel(label);
        }
      });
      return this.save();
    });
  };

  /**
   * Set our {@link Label} objects
   * @param {int[]} labelIds - PK of labels
   * @returns {Promise<int>} our database PK
   */
  ClipItem.prototype.setLabelsById = function(labelIds) {
    labelIds = labelIds || [];
    return app.Label.loadAll().then((labels) => {
      labels = labels || [];
      this._clearLabels();
      labels.forEach((label) => {
        if (labelIds.includes(label._id)) {
          this._addLabel(label);
        }
      });
      return this.save();
    });
  };

  /**
   * Get our label names
   * @returns {string[]}
   */
  ClipItem.prototype.getLabelNames = function() {
    const names = [];
    this.labels.forEach((label) => {
      names.push(label.name);
    });
    return names;
  };

  /**
   * Do we contain a {@link Label} with the given name
   * @param {?string} name
   * @returns {boolean}
   */
  ClipItem.prototype.hasLabel = function(name) {
    if (Chrome.Utils.isWhiteSpace(name)) {
      return false;
    }

    const index = this.labels.findIndex((label) => {
      return label.name === name;
    });
    return (index !== -1);
  };

  /**
   * Add a label
   * @param {Label} label
   */
  ClipItem.prototype.addLabel = function(label) {
    label.getId().then((id) => {
      if (id) {
        this._addLabel(label);
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
        if (this._removeLabel(label)) {
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
   * Clear labels - don't save
   */
  ClipItem.prototype._clearLabels = function() {
    this.labels = [];
    this.labelsId = [];
  };

  /**
   * Add a {@label} - don't save
   * @param {Label} label
   */
  ClipItem.prototype._addLabel = function(label) {
    const newLabel = new app.Label(label.name);
    newLabel._id = label._id;
    this.labels.push(newLabel);
    this.labelsId.push(newLabel._id);
  };

  /**
   * Remove a {@link Label} - don't save
   * @param {int} id - Label PK
   * @returns {boolean} true if removed
   */
  ClipItem.prototype._removeLabel = function(id) {
    const index = this.labels.findIndex((lbl) => {
      return lbl._id === id;
    });
    if (index !== -1) {
      const idx = this.labelsId.indexOf(id);
      if (idx !== -1) {
        this.labelsId.splice(idx, 1);
      } else {
        Chrome.GA.error('Did not find labelsId', 'ClipItem._removeLabel');
      }
      this.labels.splice(index, 1);
      return true;
    }
    return false;
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
        return Promise.reject(err);
      }
    }).catch((err) => {
      if (err.message === ClipItem.ERROR_REMOVE_FAILED) {
        // nothing to delete, give up
        err.message = ClipItem.ERROR_DB_FULL;
      }
      return Promise.reject(err);
    });
  };

  /**
   * Save to database, deleting old items if needed
   * @returns {Promise<void>}
   */
  ClipItem.prototype._safeSave = function() {
    if (Chrome.Utils.isWhiteSpace(this.text)) {
      return Promise.reject(new Error(ClipItem.ERROR_EMPTY_TEXT));
    }
    const MAX_DELETES = 100;

    /**
     * Repeat function call up to count equals 0
     * @param {int} count - track number of calls
     * @returns {Promise<void>}
     */
    const repeatFunc = ((count) => {
      if (count === 0) {
        return Promise.reject(new Error(ClipItem.ERROR_DB_FULL));
      }
      return this._saveOrDeleteOldest().then(function(key) {
        if (key) {
          return Promise.resolve();
        }
        return repeatFunc(count - 1);
      }).catch((err) => {
        console.error(err);
        return Promise.reject(err);
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
   * Get a new {@link ClipItem} from the database
   * @param {string} text - The text of the clip
   * @returns {Promise<ClipItem>} A new {@link ClipItem}
   */
  ClipItem.getNew = function(text) {
    const clipTable = app.DB.clips();
    return clipTable.where('text').equals(text).first().then((c) => {
      if (c) {
        const clipItem = new app.ClipItem(c.text, c.date, c.fav, c.remote,
            c.device, c.labelsId, c.labels);
        clipItem._id = c._id;
        return Promise.resolve(clipItem);
      }
      return Promise.reject(new Error(ClipItem._ERROR_NO_CLIP));
    });
  };

  /**
   * Get a {@link ClipItem} data from the database
   * @param {string} text - The text of the clip
   * @returns {Promise<ClipItem|undefined>} A new {@link ClipItem},
   * undefined if not found
   * @private
   */
  ClipItem._get = function(text) {
    return app.DB.clips().where('text').equals(text).first();
  };

  /**
   * Add new {@link ClipItem} to storage
   * @param {string} text - The text of the clip
   * @param {int} date - Time in milliSecs from epoch
   * @param {boolean} fav - true if this has been marked as a favorite
   * @param {boolean} remote - true if this came from a device other than ours
   * @param {string} device - A String representing the source device
   * @param {boolean} [keepState=false] - if true keep labels and fav if true
   * @returns {Promise<ClipItem>} A new {@link ClipItem}
   */
  ClipItem.add = function(text, date, fav, remote, device, keepState = false) {
    const clipItem = new ClipItem(text, date, fav, remote, device);
    if (keepState) {
      // make sure fav stays true and labels stay
      return ClipItem._get(text).then((clip) => {
        if (clip !== undefined) {
          if (clip.fav) {
            clipItem.fav = true;
          }
          clipItem.labelsId = clip.labelsId;
          clipItem.labels = clip.labels;
        }
        return clipItem.save();
      }).then(() => {
        return Promise.resolve(clipItem);
      });
    } else {
      return clipItem.save().then(() => {
        return Promise.resolve(clipItem);
      });
    }
  };

  /**
   * Add the given {@link ClipItem} objects
   * @param {ClipItem[]} clipItems
   * @returns {Promise<void>}
   */
  ClipItem.bulkPut = function(clipItems) {
    const array = Array.isArray(clipItems) ? clipItems : [clipItems];
    return app.DB.get().transaction('rw', app.DB.clips(), () => {
      return app.DB.clips().bulkPut(array).catch((err) => {
        // some may have failed if the same clipItem text was added again
        // we'll go ahead and commit the successes
        Chrome.Log.error(err.message, 'ClipItem.bulkPut',
            'Not all deletes were undone');
        return Promise.resolve();
      });
    });
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
   * Get all the {@link ClipItem} objects from storage, sorted from newest to
   * oldest
   * @param {?string} [labelName=''] - optional {@link Label} name
   * to filter on
   * @returns {Promise<ClipItem[]>}
   */
  ClipItem.loadAll = function(labelName = '') {
    if (labelName) {
      const label = new app.Label(labelName);
      return label.getId().then((id) => {
        if (id) {
          // filter by label
          return app.DB.clips().where('labelsId').equals(id).reverse().
              sortBy('date');
        } else {
          return app.DB.clips().reverse().sortBy('date');
        }
      });
    } else {
      return app.DB.clips().reverse().sortBy('date');
    }
  };

  /**
   * Remove the given {@link Label} PK from all {@link ClipItem} objects
   * @param {int} labelId - Label PK to delete
   */
  ClipItem.removeLabel = function(labelId) {
    app.DB.get().transaction('rw', app.DB.clips(), () => {
      ClipItem.loadAll().then((clipItems) => {
        const changedClipItems = [];
        clipItems.forEach((clipItem) => {
          if (clipItem._removeLabel(labelId)) {
            changedClipItems.push(clipItem);
          }
        });
        
        const promises = [];
        changedClipItems.forEach((clipItem) => {
          promises.push(clipItem.save());
        });
        return Promise.all(promises);
      }).catch((err) => {
        return Promise.reject(err);
      });
    }).catch((err) => {
      Chrome.Log.error(err.message, 'ClipItem.removeLabel',
          'Failed to remove label from Clip Items.');
    });
  };

  /**
   * Update the given {@link Label} name in all {@link ClipItem} objects
   * @param {string} newName
   * @param {string} oldName
   */
  ClipItem.updateLabel = function(newName, oldName) {
    app.DB.get().transaction('rw', app.DB.clips(), () => {
      ClipItem.loadAll().then((clipItems) => {
        const changedClipItems = [];
        clipItems.forEach((clipItem) => {
          const index = clipItem.labels.findIndex((label) => {
            return label.name === oldName;
          });
          if (index !== -1) {
            clipItem.labels[index].name = newName;
            changedClipItems.push(clipItem);
          }
        });
        
        const promises = [];
        changedClipItems.forEach((clipItem) => {
          promises.push(clipItem.save());
        });
        return Promise.all(promises);
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
   * @returns {Dexie.Promise<boolean>} true if items were deleted
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
        return Promise.reject(new Error(ClipItem.ERROR_REMOVE_FAILED));
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
        return Promise.reject(new Error(ClipItem.ERROR_REMOVE_FAILED));
      }
    }).then(() => {
      return Promise.resolve();
    });
  };

  window.app = window.app || {};
  window.app.ClipItem = ClipItem;
})(window);
