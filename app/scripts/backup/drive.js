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
   * Get the array of files in our app folder
   * @param {boolean} interactive - if true, user initiated
   * @returns {Promise<Object[]>} Array of file objects
   * @private
   */
  function _getFiles(interactive = false) {
    return Chrome.Auth.getToken(interactive).then((token) => {
      gapi.client.setToken({access_token: token});
      return gapi.client.drive.files.list({spaces: _PARENT_FOLDER});
    }).then((response) => {
      response = response || {};
      const result = response.result || {};
      return Promise.resolve(result.files);
    });
  }

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
   * Process the error message
   * @param {Object} errObj
   * @returns {string} error message
   * @private
   */
  function _getErrorMsg(errObj) {
    let ret = 'Unknown error';
    if (errObj.message) {
      ret = errObj.message;
    } else if (errObj.result) {
      const result = errObj.result;
      if (result.error && result.error.message) {
        ret = result.error.message;
      } else if (result.statusText) {
        ret = result.statusText;
      }
    }
    return ret;
  }

  /**
   * Create a zip file in our app folder
   * @param {string} filename
   * @param {app.Zip.Data} data
   * @returns {Promise<Object>} gapi response
   * @private
   */
  function _createZipFile(filename, data) {
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelim = '\r\n--' + boundary + '--';

    // const contentType = 'application/zip, application/octet-stream';
    const contentType = 'application/zip';

    const metadata = {
      'name': filename,
      'parents': [_PARENT_FOLDER],
      'mimeType': contentType,
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        data +
        closeDelim;

    return gapi.client.request({
      'path': '/upload' + _FILES_PATH,
      'method': 'POST',
      'params': {'uploadType': 'multipart'},
      'headers': {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
      },
      'body': multipartRequestBody,
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

    return gapi.client.request({
      'path': _FILES_PATH + fileId,
      'method': 'DELETE',
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

    return Promise.resolve().then(() => {
      return gapi.client.request({
        'path': _FILES_PATH + fileId,
        'method': 'GET',
        'params': {'alt': 'media'},
      });
    }).then((response) => {
      response = response || {};
      if ((response.status === 200) && response.body) {
        const data = _csvToIntArray(response.body);
        return Promise.resolve(data);
      }
      const msg = _ERR.GET_FAILED + _getErrorMsg(response);
      return Promise.reject(new Error(msg));
    }).catch((err) => {
      const msg = _ERR.GET_FAILED + _getErrorMsg(err);
      Chrome.Log.error(msg, 'Drive.getZipFileContents');
      return Promise.reject(new Error(msg));
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
    /**
     * Create a zip file in our app folder
     * @param {string} filename
     * @param {app.Zip.Data} data - data bytes
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<string>} file id
     * @memberOf app.Drive
     */
    createZipFile: function(filename, data, interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return Chrome.Auth.getToken(interactive).then((token) => {
        gapi.client.setToken({access_token: token});
        return _createZipFile(filename, data);
      }).then((response) => {
        response = response || {};
        const result = response.result || {};
        return Promise.resolve(result.id);
      }).catch((err) => {
        const msg =
            'Failed to create file on Google Drive: ' + _getErrorMsg(err);
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
        const msg =
            _ERR.GET_FAILED + _getErrorMsg(err);
        Chrome.Log.error(msg, 'Drive.getZipFileContents');
        return Promise.reject(new Error(msg));
      });
    },
    /**
     * Delete a file in our app folder
     * @param {string} fileId
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<void>}
     * @memberOf app.Drive
     */
    deleteFile: function(fileId, interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return Chrome.Auth.getToken(interactive).then((token) => {
        gapi.client.setToken({access_token: token});
        return _deleteFile(fileId);
      }).catch((err) => {
        const msg =
            'Failed to delete file on Google Drive: ' + _getErrorMsg(err);
        Chrome.Log.error(msg, 'Drive.deleteFile');
        // unfortunate, but OK
        return Promise.resolve();
      });
    },
  };
})(window);
