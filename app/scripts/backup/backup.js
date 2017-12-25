/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle backup and restore of data
 * @namespace
 */
app.Backup = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Data to backup
   * @typedef {{}} app.Backup.Data
   * @property {app.Label[]} labels - Array of Label objects
   * @property {app.ClipItem[]} clipItems - Array of ClipItem object
   * @memberOf app.Backup
   */

  const _BACKUP_FILENAME = 'backup.txt';

  const _ERR_NO_DATA = 'No data to backup.';

  /**
   * Get the zip filename
   * @returns {string}
   * @private
   * @memberOf app.Backup
   */
  function _getZipFilename() {
    let name = `Chrome_${app.Device.myOS()}_${app.Device.mySN()}.zip`;
    return name.replace(/ /g, '_');
  }

  /**
   * Get all the data to backup
   * @returns {Promise<app.Backup.Data>} the data to backup
   * @private
   * @memberOf app.Backup
   */
  function _getData() {
    const data = {};
    return app.Label.loadAll().then((labels) => {
      labels = labels || [];
      data.labels = labels;
      return app.ClipItem.loadAll();
    }).then((clipItems) => {
      clipItems = clipItems || [];
      data.clipItems = clipItems;
      return Promise.resolve(data);
    });
  }

  return {

    /**
     * Perform the backup
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<void>}
     * @memberOf app.Backup
     */
    doBackup: function(interactive = false) {
      // const conf = Chrome.JSONUtils.shallowCopy(Chrome.Http.conf);
      // conf.isAuth = true;
      // conf.retryToken = true;
      // conf.interactive = interactive;
      return _getData().then((data) => {
        if (!data.labels.length && !data.clipItems.length) {
          return Promise.reject(new Error(_ERR_NO_DATA));
        }
        const dataString = JSON.stringify(data);
        return Promise.resolve(dataString);
      }).then((dataString) => {
        return app.Zip.zipFile(_BACKUP_FILENAME, dataString);
      }).then((zipData) => {
        // TODO remove
        return app.Zip.unzipFileAsString(_BACKUP_FILENAME, zipData);
      }).then((dataString) => {
        // TODO remove
        // console.log('unzipped string:\n\n', dataString);
        const data = JSON.parse(dataString);
        console.log('unzipped data:\n\n', data);
        return Promise.resolve();
      });
    },
  };
})();
