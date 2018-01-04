/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
  'use strict';
  window.app = window.app || {};

  new ExceptionHandler();

  /**
   * A backup file's metadata
   * @property {string} id - Drive file id
   * @property {boolean} isMine - true if backup from our device
   * @property {string} name - Drive filename
   * @property {string} model - model of backup device
   * @property {string} nickname - nickname of backup device
   * @property {string} sn - sn of backup device
   * @property {string} os - os of backup device
   * @property {int} date - file modification date
   * @alias app.BackupFile
   */
  app.BackupFile = class BackupFile {

    /**
     * Create a new BackupFile
     * @param {Object} driveFile - a Google drive file
     * @constructor
     */
    constructor(driveFile) {
      this.id = driveFile.id;
      this.isMine = false;
      this.name = driveFile.name;
      this.model = driveFile.appProperties.model;
      this.nickname = driveFile.appProperties.nickname;
      this.sn = driveFile.appProperties.sn;
      this.os = driveFile.appProperties.os;
      this.date = new Date(driveFile.modifiedTime).valueOf();
      
      this.isMine = this._isMyFile();
    }
    
    /**
     * Get the Drive (Custom) appProperties for this file
     * @returns {{}} key-value pairs
     */
    getAppProperties() {
      return {
        model: this.model,
        nickname: this.nickname,
        sn: this.sn,
        os: this.os,
      };
    }

    /**
     * Is this file for our device
     * @private
     * @returns {boolean}
     */
    _isMyFile() {
      return ((this.sn === app.Device.mySN()) &&
          (this.model === app.Device.myModel()) &&
          (this.os === app.Device.myOS()));
    }
    
    /**
     * Is this file more recent than the given file
     * @param {app.BackupFile} file
     * @returns {boolean}
     */
    isNewer(file) {
      return (this.date > file.date);
    }
  };
})();
