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

  const _ERR_ZIP_FAILED = 'Failed to create zip file.';

  return {

    /**
     * Zip a file
     * @param {string} fileName
     * @param {string} dataString
     * @returns {Promise<Array>} zipped bytes
     * @memberOf app.Zip
     */
    zipFile: function(fileName, dataString) {
      const options = {
        type: 'uint8array',
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
     * @param {string} fileName
     * @param {Array[]} data
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
