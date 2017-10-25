/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage the Dexie database
 * @see http://dexie.org/
 * @namespace
 */
app.DB = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * The Dexie database
   * @see http://dexie.org/
   * @type {Object}
   * @private
   * @memberOf app.DB
   */
  let _db;

  /**
   * Event: called when document and resources are loaded<br />
   * Initialize Dexie
   * @private
   * @memberOf app.DB
   */
  function _onLoad() {
    _db = new Dexie('ClipItemsDB');

    // define database
    _db.version(1).stores({
      clipItems: '&text, date',
    });

    // add labels table and store current clips to tmp table
    _db.version(2).stores({
      clipItems: null,
      clipItemsTmp: '&text, date',
      labels: '++_id, &name',
    }).upgrade(function(t) {
      let clipItems;
      return t.db.clipItems.toArray().then((ob) => {
        clipItems = ob;
        return t.idbtrans.objectStore('clipItemsTmp');
      }).then((clipItemsTmp) => {
        clipItems.forEach((clipItem) => clipItemsTmp.put(clipItem));
        return Promise.resolve();
      });
    });

    // add new clip table, copy in old items and delete tmp table
    _db.version(3).stores({
      clipItems: '++_id, &text, date, *labelsId',
    }).upgrade(function(t) {
      let clipItems;
      return t.db.clipItemsTmp.toArray().then((clips) => {
        clipItems = clips;
        clips.forEach((clipItem) => {
          clipItem.labelsId = [];
        });
        return t.idbtrans.objectStore('clipItems');
      }).then((clipItemsTable) => {
        clipItems.forEach((clipItem) => clipItemsTable.put(clipItem));
        return Promise.resolve();
      }).then(() => {
        t.idbtrans.db.deleteObjectStore('clipItemsTmp');
        return Promise.resolve();
      });
    });

    // add labels array to clipItems
    _db.version(4).stores({
      clipItems: '++_id, &text, date, *labelsId',
      labels: '++_id, &name',
    }).upgrade(function(t) {
      let clipItems;
      return t.db.clipItems.toArray().then((clips) => {
        clipItems = clips;
        return t.db.labels.toArray();
      }).then((labels) => {
        clipItems.forEach((clipItem) => {
          clipItem.labels = [];
          labels.forEach((label) => {
            if (clipItem.labelsId.includes(label._id)) {
              clipItem.labels.push(label);
            }
          });
        });
        return t.idbtrans.objectStore('clipItems');
      }).then((clipItemsTable) => {
        clipItems.forEach((clipItem) => clipItemsTable.put(clipItem));
        return Promise.resolve();
      });
    });

    _db.labels.hook('deleting', function(primKey) {
      // eslint-disable-next-line no-invalid-this
      this.onsuccess = function() {
        app.ClipItem.removeLabel(primKey);
      };
    });

    _db.labels.hook('updating', function(mods, primKey, obj) {
      // eslint-disable-next-line no-invalid-this
      this.onsuccess = function() {
        if (mods.hasOwnProperty('name')) {
          // 'name' property is being updated
          if (typeof mods.name === 'string') {
            // change not delete
            app.ClipItem.updateLabel(mods.name, obj.name);
          }
        }
      };
    });

    _db.clipItems.mapToClass(app.ClipItem);
    _db.labels.mapToClass(app.Label);
  }

  // listen for document and resources loaded
  addEventListener('load', _onLoad);

  return {
    /**
     * Get the database
     * @returns {Object} the Dexie db object
     * @memberOf app.DB
     */
    get: function() {
      return _db;
    },

    /**
     * Get the clipItems table
     * @returns {Object}
     * @memberOf app.DB
     */
    clips: function() {
      return _db.clipItems;
    },

    /**
     * Get the labels table
     * @returns {Object}
     * @memberOf app.DB
     */
    labels: function() {
      return _db.labels;
    },
  };
})();
