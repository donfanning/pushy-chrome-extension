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
   * Merge the data in two {@link app.Backup.Data} objects
   * @param {app.Backup.Data} data1
   * @param {app.Backup.Data} data2
   * @returns {Promise<app.Backup.Data>} merged data
   * @private
   * @memberOf app.Backup
   */
  function _mergeData(data1, data2) {

    function getLargestLabelId(labels) {
      let ret = 0;
      labels.forEach((label) => {
        ret = (label._id > ret) ? label._id : ret;
      });
      return ret;
    }

    function getLargestClipItemId(clipItems) {
      let ret = 0;
      clipItems.forEach((clipItem) => {
        ret = (clipItem._id > ret) ? clipItem._id : ret;
      });
      return ret;
    }

    function getLabelPos(labels, theLabel) {
      return labels.findIndex((label) => {
        return label.name === theLabel.name;
      });
    }

    function getClipItemPos(clipItems, theClipItem) {
      return clipItems.findIndex((clipItem) => {
        return clipItem.text === theClipItem.text;
      });
    }

    function updateLabelId(clipItems, theLabel) {
      // update labelId in all clipItems
      clipItems.forEach((clipItem) => {
        const labels = clipItem.labels;
        const labelsId = clipItem.labelsId;
        for (let i = 0; i < labels.length; i++) {
          if (labels[i].name === theLabel.name) {
            const idx = labelsId.indexOf(labels[i]._id);
            if (idx !== -1) {
              labelsId[idx] = theLabel._id; 
            }
            labels[i]._id = theLabel._id;
            break;
          }
        }
      });
    }

    const data = data1;
    const dataLabels = data.labels;
    const dataClipItems = data.clipItems;

    const data2Labels = data2.labels;
    const data2ClipItems = data2.clipItems;

    let newLabelId = getLargestLabelId(dataLabels);
    newLabelId++;
    let newClipItemId = getLargestClipItemId(dataClipItems);
    newClipItemId++;

    data2Labels.forEach((label) => {
      const pos = getLabelPos(dataLabels, label);
      if (pos === -1) {
        // add new label with unique id to theirs
        const newLabel = new app.Label(label.name);
        newLabel._id = newLabelId;
        dataLabels.push(newLabel);
        newLabelId++;
        // update labelId in our clips
        updateLabelId(data2ClipItems, newLabel);
      } else {
        // label exists in both
        if (label._id !== dataLabels[pos]._id) {
          // update label id our clips
          updateLabelId(data2ClipItems, dataLabels[pos]);
        }
      }
    });
    
    data2ClipItems.forEach((clipItem) => {
      const pos = getClipItemPos(dataClipItems, clipItem);
      if (pos === -1) {
        // add new clip
        dataClipItems.push(clipItem);
      } else {
        // shared clip - sync
        const dataClipItem = dataClipItems[pos];
        if (clipItem.fav) {
          // favorite true has priority
          dataClipItem.fav = true;
        }
        if (clipItem.date > dataClipItem.date) {
          // newest clip has priority
          dataClipItem.date = clipItem.date;
          dataClipItem.device = clipItem.device;
          dataClipItem.remote = true;
        }
        // sync labels and labelsId
        const dataLabels = dataClipItem.labels;
        const dataLabelsId = dataClipItem.labelsId;
        clipItem.labels.forEach((label) => {
          const pos = getLabelPos(dataLabels, label);
          if (pos === -1) {
            // add new label
            dataLabels.push(label);
            dataLabelsId.push(label._id);
          }
        });
      }
    });
    return Promise.resolve(data);
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
   * Perform the sync transaction between the database and Drive
   * @param {?string} fileId - drive id to sync with
   * @param {app.Backup.Data} cloudData
   * @param {boolean} [interactive=false] - true if user initiated
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Backup
   */
  function _syncTransaction(fileId, cloudData, interactive = false) {
    let mergedData;
    const db = app.DB.get();
    return db.transaction('rw', db.clipItems, db.labels, () => {
      return _getAllData().then((dbData) => {
        return _mergeData(dbData, cloudData);
      }).then((mergeData) => {
        mergedData = mergeData;
        return _deleteAllData();
      }).then(() => {
        return _addAllData(mergedData);
      });
    }).then(() => {
      // TODO need to backup to correct fileId
      // can't do this in transaction
      console.log('doing backup');
      // return _backupData(mergedData);
      if (app.Main) {
        // need to reload menu labels
        app.Main.updateLabels();
      }
      return Promise.resolve();
    }).catch((err) => {
      if (app.Main) {
        // need to reload menu labels on rollback
        app.Main.updateLabels();
      }
      return Promise.reject(err);
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
        const file = _getZipFilename();
        const appProps = app.BackupFile.getAppProperties();
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
     * Perform a sync
     * @param {?string} fileId - drive id to sync
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<void>}
     * @memberOf app.Backup
     */
    doSync: function(fileId, interactive = false) {
      if (Chrome.Utils.isWhiteSpace(fileId)) {
        fileId = Chrome.Storage.get(_BACKUP_ID_KEY, '');
      }
      if (Chrome.Utils.isWhiteSpace(fileId)) {
        return Promise.reject(new Error(_ERR.NO_FILE_ID));
      }

      return app.Drive.getZipFileContents(fileId, interactive).then((data) => {
        return app.Zip.unzipFileAsString(_BACKUP_FILENAME, data);
      }).then((dataString) => {
        let syncData = Chrome.JSONUtils.parse(dataString);
        if (!syncData) {
          return Promise.reject(new Error(_ERR.PARSE));
        }
        return _syncTransaction(fileId, syncData, interactive);
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
