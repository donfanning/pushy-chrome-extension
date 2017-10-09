/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
  'use strict';

  new ExceptionHandler();

  /**
   * A Label for a {@link app.ClipItem}
   * @constructor
   * @alias Label
   * @param {string} name - label name
   * @property {int} _id - database PK
   */
  const Label = function(name) {
    this.name = name;
  };

  /**
   * Get the PK for our name
   * @returns {Promise<int|null>} database PK or null if text not found
   */
  Label.prototype.getId = function() {
    return app.DB.labels().where('name').equals(this.name).first((label) => {
      if (label !== undefined) {
        return Promise.resolve(label._id);
      }
      return Promise.resolve(null);
    });
  };

  /**
   * Update our name
   * @param {string} name - new name
   * @returns {Promise<boolean>} true if database updated
   */
  Label.prototype.setName = function(name) {
    this.name = name;
    return app.DB.labels().update(this._id, this);
  };

  /**
   * Save to database
   * @returns {Promise<int>} database PK
   */
  Label.prototype.save = function() {
    return app.DB.labels().put(this);
  };

  /**
   * Update database
   * @returns {Promise<int>} database PK
   */
  Label.prototype.save = function() {
    return app.DB.labels().put(this);
  };

  /**
   * Add if new or update if existing
   * @returns {Promise<boolean>} true if updated
   */
  Label.prototype._addOrUpdate = function() {
    let updated = false;
    return this.getId().then((id) => {
      if (id) {
        updated = true;
        this._id = id;
        return app.DB.labels().update(id, this);
      } else {
        return app.DB.labels().put(this);
      }
    }).then(() => {
      return Promise.resolve(updated);
    });
  };

  /**
   * Delete from database
   * @returns {Promise<void>} void
   */
  Label.prototype.delete = function() {
    return app.DB.labels().delete(this._id);
  };

  /**
   * Error indicating that {@link Label} name is null or all whitespace
   * @const
   * @type {string}
   */
  Label.ERROR_EMPTY_TEXT = 'Text is only whitespace';

  /**
   * Error indicating that {@link Label} is already in database
   * @const
   * @type {string}
   */
  Label.ERROR_EXISTS = 'Label exists.';

  /**
   * Add a new {@link Label} to database
   * @param {string} name - The text of the label
   * @returns {Promise<Label>} A new {@link Label}
   */
  Label.add = function(name) {
    if (Chrome.Utils.isWhiteSpace(name)) {
      return Promise.reject(new Error(Label.ERROR_EMPTY_TEXT));
    }
    const label = new Label(name);
    return label.getId().then((id) => {
      if (id) {
        return Promise.reject(new Error(Label.ERROR_EXISTS));
      }
      return label.save();
    }).then(() => {
      return Promise.resolve(label);
    });
  };

  /**
   * Return true is there are no stored {@link Label} objects
   * @returns {Promise<boolean>} true if no {@link Label} objects
   */
  Label.isTableEmpty = function() {
    return app.DB.labels().count().then((count) => {
      return Promise.resolve(!count);
    });
  };

  /**
   * Return all the {@link Label} objects from storage
   * @returns {Promise<Array>} Array of {@link Label} objects
   */
  Label.loadAll = function() {
    return app.DB.labels().orderBy('name').toArray();
  };

  window.app = window.app || {};
  window.app.Label = Label;
})();
