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
  };

  /**
   * Delete the backup with the given fileId
   * @param {string} fileId
   * @returns {Promise<void>}
   * @private
   */
  // function _deleteBackup(fileId) {
  //   const url = _BASE_URL + fileId;
  //   const conf = Chrome.JSONUtils.shallowCopy(Chrome.Http2.conf);
  //   conf.isAuth = true;
  //   conf.retryToken = true;
  //   conf.interactive = true;
  //   return Chrome.Http2.doDelete(url, conf).then((response) => {
  //     if (response.ok) {
  //       return Promise.resolve();
  //     } else {
  //       return Promise.reject(new Error(Chrome.Http2.getError(response)));
  //     }
  //   }).catch((response) => {
  //     if (response.status === 404) {
  //       // file not found
  //       return Promise.resolve();
  //     } else {
  //       return Promise.reject(new Error(Chrome.Http2.getError(response)));
  //     }
  //   });
  // }

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
      const files = result.files || [];
      console.log(files);
      return Promise.resolve();
    });
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
        console.log('createZipFile response: ', response);
        const result = response.result || {};
        return Promise.resolve(result.id);
      }).catch((err) => {
        const msg = 'Failed to create file on Google Drive: ' + err.message;
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
      }).then((response) => {
        response = response || {};
        console.log('deleteFile response: ', response);
        return Promise.resolve();
      });
    },
  };
})(window);
