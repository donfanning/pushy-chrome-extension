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
   * The original Dexie database version
   * @const
   * @type {int}
   * @private
   * @memberOf app.DB
   */
  const _VER_ONE = 1;

  /**
   * The second Dexie database version - adding {@link Label} support
   * @const
   * @type {int}
   * @private
   * @memberOf app.DB
   */
  const _VER_TWO = 2;

  /**
   * Event: called when document and resources are loaded<br />
   * Initialize Dexie
   * @private
   * @memberOf app.DB
   */
  function _onLoad() {
    _db = new Dexie('ClipItemsDB');

    // define database
    _db.version(_VER_ONE).stores({
      clipItems: '&text, date',
    });

    // add labels support
    _db.version(_VER_TWO).stores({
      labels: '++_id, &name',
      clipItems: '++_id, &text, date, *labelsId',
    });

    _db.clipItems.mapToClass(app.ClipItem);
    _db.labels.mapToClass(app.Label);
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

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


