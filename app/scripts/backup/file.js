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
   * A backup file
   * @property {int} date - file creation dat
   * @property {App.Zip.Data} data - the zipped data
   * @alias app.BackupFile
   */
  app.BackupFile = class BackupFile {

    /**
     * Create a new BackupFile
     * @param {Object} driveFile - a Google drive file
     * @constructor
     */
    constructor(driveFile) {
      this.fileId = driveFile.id;
      this.name = driveFile.name;
      this.model = driveFile.appProperties.model;
      this.nickname = driveFile.appProperties.nickname;
      this.sn = driveFile.appProperties.sn;
      this.os = driveFile.appProperties.os;
      this.date = new Date(driveFile.modifiedTime).valueOf();
      this.data = null;
    }

    /**
     * Get the appProperties for our device
     * @returns {{}} key-value pairs
     */
    static getAppProperties() {
      return {
        model: app.Device.myModel(),
        nickname: app.Device.myNickname(),
        sn: app.Device.mySN(),
        os: app.Device.myOS(),
      };
    }

    /**
     * Is this file for our device
     * @returns {boolean}
     */
    isMyFile() {
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
