/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage interaction with Google Drive
 * @see https://developers.google.com/drive/v3/web/about-sdk
 * @namespace
 */
app.Drive = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * path to drive files api
   * @const
   * @private
   * @memberOf app.Drive
   */
  const _FILES_PATH = '/drive/v3/files/';

  /**
   * Our parent folder
   * @type {string}
   * @private
   * @memberOf app.Drive
   */
  const _PARENT_FOLDER = 'appDataFolder';

  /**
   * Error messages
   * @type {Object}
   * @private
   * @memberOf app.Drive
   */
  const _ERR = {
    NO_SIGNIN: 'Not signed in',
    NO_FILE_ID: 'No fileId specified',
    GET_FAILED: 'Failed to get file from Google Drive: ',
  };

  /**
   * Convert a CSV string to an int array
   * @param {string} input
   * @returns {int[]} Array of integers
   * @private
   */
  function _csvToIntArray(input) {
    let ret;
    ret = input.split(',');
    for (let i = 0; i < ret.length; i++) {
      ret[i] = parseInt(ret[i], 10);
    }
    return ret;
  }

  /**
   * Get the array of files in our app folder
   * @see https://developers.google.com/drive/v3/reference/files/list
   * @returns {Promise<Object[]>} Array of Google Drive file objects
   * @private
   */
  function _getFiles() {
    const request = {
      pageSize: 1000,
      spaces: [_PARENT_FOLDER],
      fields: 'files(id, name, modifiedTime, appProperties)',
    };
    
    return gapi.client.drive.files.list(request).then((response) => {
      return Promise.resolve(response.result.files);
    }, (reason) => {
      return Promise.reject(new Error(reason.result.error.message));
    });
  }

  /**
   * Create a zip file in our app folder
   * @param {string} filename
   * @param {{}} appProps - metadata
   * @param {app.Zip.Data} data
   * @returns {Promise<string>} file id
   * @private
   */
  function _createZipFile(filename, appProps, data) {
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelim = '\r\n--' + boundary + '--';

    const contentType = 'application/zip';

    const metadata = {
      name: filename,
      parents: [_PARENT_FOLDER],
      mimeType: contentType,
      appProperties: appProps,
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        data +
        closeDelim;

    const request = {
      path: '/upload' + _FILES_PATH,
      method: 'POST',
      params: {uploadType: 'multipart'},
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
      },
      body: multipartRequestBody,
    };
    
    return gapi.client.request(request).then((response) => {
      if ((response.status >= 200) && (response.status < 300)) {
        return Promise.resolve(response.result.id);
      }
      const msg = _ERR.GET_FAILED + 'Status: ' + response.status + ' ' +
          response.statusText;
      return Promise.reject(new Error(msg));
    }, (reason) => {
      return Promise.reject(new Error(reason.result.error.message));
    });
  }

  /**
   * Delete a file in our app folder
   * @param {string} fileId
   * @returns {Promise<void>}
   * @private
   */
  function _deleteFile(fileId) {
    if (Chrome.Utils.isWhiteSpace(fileId)) {
      return Promise.reject(_ERR.NO_FILE_ID);
    }

    const request = {
      'path': _FILES_PATH + fileId,
      'method': 'DELETE',
    };

    return gapi.client.request(request).then(() => {
      return Promise.resolve();
    }, (reason) => {
      return Promise.reject(new Error(reason.result.error.message));
    });
  }

  /**
   * Get a file's content from our app folder
   * @param {string} fileId
   * @returns {Promise<app.Zip.Data>}
   * @private
   */
  function _getZipFileContents(fileId) {
    if (Chrome.Utils.isWhiteSpace(fileId)) {
      return Promise.reject(_ERR.NO_FILE_ID);
    }
    
    const request = {
      'path': _FILES_PATH + fileId,
      'method': 'GET',
      'params': {'alt': 'media'},
    };

    return gapi.client.request(request).then((response) => {
      if (((response.status >= 200) && (response.status < 300)) &&
          response.body) {
        const data = _csvToIntArray(response.body);
        return Promise.resolve(data);
      }
      const msg = _ERR.GET_FAILED + 'Status: ' + response.status + ' ' +
          response.statusText;
      return Promise.reject(new Error(msg));
    }, (reason) => {
      return Promise.reject(new Error(reason.result.error.message));
    });
  }

  /**
   * Event: called when document and resources are loaded<br />
   * Initialize Google Analytics
   * @private
   * @memberOf app.GA
   */
  function _onLoad() {
    // load the drive library
    gapi.client.load('drive', 'v3', function() {
      console.log('gapi loaded');
    });
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  return {

    getFiles: function(interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return Chrome.Auth.getToken(interactive).then((token) => {
        gapi.client.setToken({access_token: token});
        return _getFiles();
      }).then((files) => {
        files = files || [];
        return Promise.resolve(files);
      }).catch((err) => {
        const msg =
            'Failed to get files list from Google Drive: ' + err.message;
        return Promise.reject(new Error(msg));
      });
    },

    /**
     * Create a zip file in our app folder
     * @param {string} filename
     * @param {{}} appProps - metadata
     * @param {app.Zip.Data} data - data bytes
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<string>} file id
     * @memberOf app.Drive
     */
    createZipFile: function(filename, appProps, data, interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return Chrome.Auth.getToken(interactive).then((token) => {
        gapi.client.setToken({access_token: token});
        return _createZipFile(filename, appProps, data);
      }).catch((err) => {
        const msg =
            'Failed to create file on Google Drive: ' + err.message;
        return Promise.reject(new Error(msg));
      });
    },

    /**
     * Get a zip file's content in our app folder
     * @param {string} fileId
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<app.Zip.Data>}
     * @memberOf app.Drive
     */
    getZipFileContents: function(fileId, interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return Chrome.Auth.getToken(interactive).then((token) => {
        gapi.client.setToken({access_token: token});
        return _getZipFileContents(fileId);
      }).catch((err) => {
        const msg = _ERR.GET_FAILED + err.message;
        return Promise.reject(new Error(msg));
      });
    },

    /**
     * Delete a file in our app folder
     * @param {string} fileId
     * @param {boolean} [interactive=false] - if true, user initiated
     * @param {boolean} [eatError=false] - if true, ignore failed delete
     * @returns {Promise<void>}
     * @memberOf app.Drive
     */
    deleteFile: function(fileId, interactive = false, eatError = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return Chrome.Auth.getToken(interactive).then((token) => {
        gapi.client.setToken({access_token: token});
        return _deleteFile(fileId);
      }).catch((err) => {
        const msg =
            'Failed to delete file on Google Drive: ' + err.message;
        if (eatError) {
          // unfortunate, but OK
          Chrome.Log.error(msg, 'Drive.deleteFile');
          return Promise.resolve();
        }
        return Promise.reject(new Error(msg));
      });
    },
  };
})(window);
