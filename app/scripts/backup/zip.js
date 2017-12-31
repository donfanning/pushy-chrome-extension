/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Zip utilities
 * @namespace
 */
app.Zip = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Data to backup
   * @typedef {base64} app.Zip.Data
   * @memberOf app.Zip
   */

  return {

    /**
     * Zip a file
     * @param {string} fileName
     * @param {string} dataString
     * @returns {Promise<app.Zip.Data>} zipped bytes
     * @memberOf app.Zip
     */
    zipFile: function(fileName, dataString) {
      // need to do base64
      // https://stackoverflow.com/a/34731665/4468645
      const options = {
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9,
        },
      };
      const zip = new JSZip();
      zip.file(fileName, dataString);
      return zip.generateAsync(options);
    },
    
    /**
     * Unzip a file into a string
     * @param {string} fileName - name of file in data
     * @param {app.Zip.Data} data - zip file contents
     * @returns {Promise<string>} file contents as string
     * @memberOf app.Zip
     */
    unzipFileAsString: function(fileName, data) {
      const zip = new JSZip();
      return zip.loadAsync(data).then((newZip) => {
        // you now have every file contained in the loaded newZip
        return newZip.file(fileName).async('string');
      });
    },
  };
})();
