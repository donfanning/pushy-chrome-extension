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
   * Data to backup or restore
   * @typedef {{}} app.Backup.Data
   * @property {Label[]} labels - Array of Label objects
   * @property {ClipItem[]} clipItems - Array of ClipItem object
   * @memberOf app.Backup
   */

  /**
   * Filename in zip file
   * @type {string}
   * @private
   * @memberOf app.Backup
   */
  const _BACKUP_FILENAME = 'backup.txt';

  /**
   * Local Storage key for last backup fileId
   * @type {string}
   * @private
   * @memberOf app.Backup
   */
  const _BACKUP_ID_KEY = 'backupFileId';

  /**
   * Error messages
   * @type {Object}
   * @private
   * @memberOf app.Backup
   */
  const _ERR = {
    NO_SIGNIN: 'Not signed in.',
    NO_BACKUP: 'Backup not enabled.',
    STRINGIFY: 'Failed to stringify data.',
    PARSE: 'Failed to parse data.',
    NO_DATA: 'No data to backup.',
    NO_FILE_ID: 'No file id was found.',
  };

  /**
   * Get the zip filename for this device
   * @returns {string}
   * @private
   * @memberOf app.Backup
   */
  function _getMyZipFilename() {
    let name = `Chrome_${app.Device.myOS()}_${app.Device.mySN()}.zip`;
    return name.replace(/ /g, '_');
  }

  /**
   * Get the appProperties for this device
   * @returns {{}} key-value pairs
   * @private
   * @memberOf app.Backup
   */
  function _getMyAppProperties() {
    return {
      model: app.Device.myModel(),
      nickname: app.Device.myNickname(),
      sn: app.Device.mySN(),
      os: app.Device.myOS(),
    };
  }

  /**
   * Get all the data to backup
   * @returns {Promise<app.Backup.Data>} the data to backup
   * @private
   * @memberOf app.Backup
   */
  function _getAllData() {
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

  /**
   * Delete all the data in the db
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Backup
   */
  function _deleteAllData() {
    return app.ClipItem.deleteAll().then(() => {
      return app.Label.deleteAll();
    });
  }

  /**
   * Add all the data to the db
   * @param {app.Backup.Data} dbData
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Backup
   */
  function _addAllData(dbData) {
    return app.Label.bulkPut(dbData.labels).then(() => {
      return app.ClipItem.bulkPut(dbData.clipItems);
    });
  }

  /**
   * Perform the restore transaction to the database
   * @param {app.Backup.Data} dbData
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Backup
   */
  function _restoreTransaction(dbData) {
    const db = app.DB.get();
    return db.transaction('rw', db.clipItems, db.labels, () => {
      return _deleteAllData().then(() => {
        return _addAllData(dbData);
      });
    }).catch((err) => {
      if (app.Main) {
        // need to reload menu labels on rollback
        app.Main.updateLabels();
      }
      return Promise.reject(err);
    });
  }

  /**
   * Perform the sync transaction between the database and the data from the
   * cloud
   * @param {app.Backup.Data} cloudData
   * @returns {Promise<app.Backup.Data>} merged data
   * @private
   * @memberOf app.Backup
   */
  function _syncTransaction(cloudData) {
    let mergedData;
    const db = app.DB.get();
    return db.transaction('rw', db.clipItems, db.labels, () => {
      return _getAllData().then((dbData) => {
        return app.MergeDBData.merge(dbData, cloudData);
      }).then((mergeData) => {
        mergedData = mergeData;
        return _deleteAllData();
      }).then(() => {
        return _addAllData(mergedData);
      });
    }).then(() => {
      if (app.Main) {
        // need to reload menu labels
        app.Main.updateLabels();
      }
      return Promise.resolve(mergedData);
    }).catch((err) => {
      if (app.Main) {
        // need to reload menu labels on rollback
        app.Main.updateLabels();
      }
      return Promise.reject(err);
    });
  }

  /**
   * Replace a backup on Google Drive
   * @param {app.BackupFile} backupFile to replace
   * @param {app.Backup.Data} data for the backup
   * @param {boolean} [interactive=false] - true if user initiated
   * @returns {Promise.<string>} new Drive file id
   * @memberOf app.Backup
   */
  function _replaceBackup(backupFile, data, interactive = false) {
    if (!data.labels.length && !data.clipItems.length) {
      return Promise.reject(new Error(_ERR.NO_DATA));
    }
    
    let dataString;
    try {
      dataString = JSON.stringify(data);
    } catch (ex) {
      return Promise.reject(new Error(_ERR.STRINGIFY));
    }
    return app.Zip.zipFile(_BACKUP_FILENAME, dataString).then((zipData) => {
      const file = backupFile.name;
      const appProps = backupFile.getAppProperties();
      return app.Drive.createZipFile(file, appProps, zipData, interactive);
    }).then((fileId) => {
      const oldId = backupFile.id;
      if (!Chrome.Utils.isWhiteSpace(oldId)) {
        // delete old backup - ignore failure to delete
        return app.Drive.deleteFile(oldId, interactive, true);
      }
      return Promise.resolve(fileId);
    });
  }

  return {

    /**
     * Perform the backup of our device
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<void>}
     * @memberOf app.Backup
     */
    doBackup: function(interactive = false) {
      return _getAllData().then((data) => {
        if (!data.labels.length && !data.clipItems.length) {
          return Promise.reject(new Error(_ERR.NO_DATA));
        }
        let dataString;
        try {
          dataString = JSON.stringify(data);
        } catch (ex) {
          return Promise.reject(new Error(_ERR.STRINGIFY));
        }
        return Promise.resolve(dataString);
      }).then((dataString) => {
        return app.Zip.zipFile(_BACKUP_FILENAME, dataString);
      }).then((zipData) => {
        const file = _getMyZipFilename();
        const appProps = _getMyAppProperties();
        return app.Drive.createZipFile(file, appProps, zipData, interactive);
      }).then((fileId) => {
        const oldId = Chrome.Storage.get(_BACKUP_ID_KEY, null);
        Chrome.Storage.set(_BACKUP_ID_KEY, fileId);
        if (!Chrome.Utils.isWhiteSpace(oldId)) {
          // delete old backup - ignore failure to delete
          return app.Drive.deleteFile(oldId, interactive, true);
        }
        return Promise.resolve();
      });
    },

    /**
     * Perform a restore
     * @param {?string} fileId - drive id to restore
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<void>}
     * @memberOf app.Backup
     */
    doRestore: function(fileId, interactive = false) {
      if (Chrome.Utils.isWhiteSpace(fileId)) {
        fileId = Chrome.Storage.get(_BACKUP_ID_KEY, '');
      }
      if (Chrome.Utils.isWhiteSpace(fileId)) {
        return Promise.reject(new Error(_ERR.NO_FILE_ID));
      }

      return app.Drive.getZipFileContents(fileId, interactive).then((data) => {
        return app.Zip.unzipFileAsString(_BACKUP_FILENAME, data);
      }).then((dataString) => {
        let restoreData = Chrome.JSONUtils.parse(dataString);
        if (!restoreData) {
          return Promise.reject(new Error(_ERR.PARSE));
        }
        return _restoreTransaction(restoreData);
      });
    },

    /**
     * Perform a sync between our data and a backup's
     * @param {app.BackupFile} file - file to sync with
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<string>} new Drive file id
     * @memberOf app.Backup
     */
    doSync: function(file, interactive = false) {
      const fileId = file.id;
      if (Chrome.Utils.isWhiteSpace(fileId)) {
        return Promise.reject(new Error(_ERR.NO_FILE_ID));
      }

      return app.Drive.getZipFileContents(fileId, interactive).then((data) => {
        return app.Zip.unzipFileAsString(_BACKUP_FILENAME, data);
      }).then((dataString) => {
        let cloudData = Chrome.JSONUtils.parse(dataString);
        if (!cloudData) {
          return Promise.reject(new Error(_ERR.PARSE));
        }
        return _syncTransaction(cloudData);
      }).then((mergedData) => {
        return _replaceBackup(file, mergedData);
      });
    },

    /**
     * Delete a backup file
     * @param {string} fileId - drive id to restore
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<void>}
     * @memberOf app.Backup
     */
    doDelete: function(fileId, interactive = false) {
      return app.Drive.deleteFile(fileId, interactive, false).then(() => {
        const ourFileId = Chrome.Storage.get(_BACKUP_ID_KEY, '');
        if (ourFileId === fileId) {
          // deleted our backup
          Chrome.Storage.set(_BACKUP_ID_KEY, null);
        }
        return Promise.resolve();
      });
    },
  };
})();
