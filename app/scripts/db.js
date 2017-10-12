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
    _db.version(1).stores({
      clipItems: '&text, date',
    });

    // add labels support
    _db.version(2).stores({
      clipItemsTmp: '&text, date',
      labels: '++_id, &name',
    }).upgrade(function(t) {
      let objects;
      return t.db.clipItems.toArray().then((ob) => {
        objects = ob;
        return t.idbtrans.objectStore('clipItemsTmp');
      }).then((clipItemsTmp) => {
        objects.forEach((o) => clipItemsTmp.put(o));
        return Promise.resolve();
      });
    });

    // add labels support
    _db.version(3).stores({
      clipItems: null,
    });

    // add labels support
    _db.version(4).stores({
      clipItems: '++_id, &text, date, *labelsId',
    }).upgrade(function(t) {

      return Promise.resolve().then(() => {
        // return t.idbtrans.objectStore('clipItemsTmp').getAll();
        return t.db.clipItemsTmp.toArray();
      }).then((objects) => {
        objects.forEach((o) => {
          o.labelsId = [];
        });
        return t.db.clipItems.bulkPut(objects);
      });
    });

    // // add labels support
    // _db.version(5).stores({
    //   clipItemsTmp: null,
    // });

    // // add labels support
    // _db.version(3).stores({
    //   clipItemsTmp: '&text, date',
    //   labels: '++_id, &name',
    // }).upgrade(function(t) {
    //   console.log(t);
    //   console.log(t.db);
    //   console.log(t.db.clipItemsTmp);
    //
    //   let objects;
    //   return t.db.clipItems.toArray().then((ob) => {
    //     objects = ob;
    //     return t.idbtrans.objectStore('clipItemsTmp');
    //   }).then((clipItemsTmp) => {
    //     objects.forEach((o) => clipItemsTmp.put(o));
    //     return Promise.resolve();
    //   });
    // });

    // add labels support
    // _db.version(4).stores({
    //   clipItemsTmp: '&text, date',
    //   labels: '++_id, &name',
    // }).upgrade(function(t) {
    //   console.log(t);
    //   console.log(t.db);
    //   console.log(t.db.clipItemsTmp);
    //
    //   let objects;
    //   return t.idbtrans.objectStore('clipItemsTmp').getAll().then((ob) => {
    //     objects = ob;
    //     return t.idbtrans.objectStore('clipItemsTmp');
    //   }).then((clipItemsTmp) => {
    //     objects.forEach((o) => clipItemsTmp.put(o));
    //     return Promise.resolve();
    //   });
    // });

    // // add labels support
    // _db.version(3).stores({
    //   clipItemsTmp: '&text, date',
    //   labels: '++_id, &name',
    // });
    //
    // // add labels support
    // _db.version(4).stores({
    //   clipItemsTmp: '&text, date',
    //   labels: '++_id, &name',
    // });
    //
    // // add labels support
    // _db.version(5).stores({
    //   clipItems: '&text, date',
    // }).upgrade(function(t) {
    //   console.log(t);
    //   console.log(t.db);
    //   console.log(t.clipItems);
    //  
    //   // Will only be executed if a version below 2 was installed.
    //   return t.db.clipItemsTmp.put({text: 'text', date: 1222222});
    //   // return t.db.clipItems.toCollection().modify(function(clipItem) {
    //   //   // Modify each clipItem:
    //   //   clipItem.fav = true;
    //   // });
    // });

    _db.open();
    _db.on('error', function(error) {
      console.log('Oh no! - ' + error);
    });

    _db.clipItems.mapToClass(app.ClipItem);
    _db.labels.mapToClass(app.Label);

    // _db.version(_VER_TWO).stores({
    //   clipItemsTmp: '&text, date',
    //   labels: '++_id, &name',
    // }).upgrade(function() {
    //   // Will only be executed if a version below 2 was installed.
    //   return _db.clipItemsTmp.put({text: 'text', date: 100001});
    // });

    // .upgrade(() => {
    //   return _db.clipItems.toArray().then((objects) => {
    //     return _db.clipItemsTmp.bulkPut(objects);
    //   }).then(() => {
    //     _db.clipItems.mapToClass(app.ClipItem);
    //     _db.labels.mapToClass(app.Label);
    //     return Promise.resolve();
    //   });
    // });

    // // add labels support
    // _db.version(3).stores({
    //   clipItems: '++_id, &text, date, *labelsId',
    // });

    // // add labels support
    // _db.version(3).stores({
    //   clipItems: '++_id, &text, date, *labelsId',
    // });

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
