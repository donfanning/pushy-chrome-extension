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
   * Scopes required for drive - override manifest values
   * @const
   * @private
   * @memberOf app.Drive
   */
  const _SCOPES = [
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.appfolder',
  ];

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
   * @type {{}}
   * @private
   * @memberOf app.Drive
   */
  const _ERR = {
    NO_SIGNIN: 'Not signed in.\n',
    NO_FILE_ID: 'No fileId specified.\n',
    LOAD_LIB: 'Failed to load gapi library.\n',
    GET_FILES: 'Failed to list of backups from Google Drive.\n',
    GET: 'Failed to get backup from Google Drive.\n',
    DELETE: 'Failed to delete backup on Google Drive.\n',
    CREATE: 'Failed to create backup on Google Drive.\n',
  };

  /**
   * Load drive library
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Drive
   */
  function _loadLib() {
    return Promise.resolve().then(() => {
      return gapi.client.load('drive', 'v3');
    }).then(() => {
      return Promise.resolve();
    }, (reason) => {
      let msg = _ERR.LOAD_LIB;
      if (reason.error && reason.error.message) {
        msg += reason.error.message;
      }
      return Promise.reject(new Error(msg));
    });
  }

  /**
   * Get an authorized drive client
   * @param {boolean} [interactive=false] - if true, user initiated
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Drive
   */
  function _getAuthorization(interactive = false) {
    return _loadLib().then(() => {
      return Chrome.Auth.getToken(interactive, _SCOPES);
    }).then((token) => {
      gapi.client.setToken({access_token: token});
      return Promise.resolve();
    });
  }

  /**
   * Convert a CSV string to an int array
   * @param {string} input
   * @returns {int[]} Array of integers
   * @private
   * @memberOf app.Drive
   */
  function _csvToIntArray(input) {
    input = input || '';
    let ret;
    ret = input.split(',');
    for (let i = 0; i < ret.length; i++) {
      ret[i] = parseInt(ret[i], 10);
    }
    return ret;
  }

  /**
   * Get an Error from a failed gapi call
   * @param {{string}} prefix  - error prefix text
   * @param {{}} reason - reason for failure
   * @param {{}} reason.result
   * @param {{}} reason.status
   * @param {{}} reason.statusText
   * @returns {Error}
   * @private
   * @memberOf app.Drive
   */
  function _getError(prefix, reason) {
    let msg = `${prefix} `;
    if (reason.result && reason.result.error && reason.result.error.message) {
      msg += reason.result.error.message;
    } else {
      msg += 'Status: ' + reason.status;
      if (reason.statusText) {
        msg += ' ' + reason.statusText;
      }
    }
    return new Error(msg);
  }

  /**
   * Get the array of files in our app folder
   * @see https://developers.google.com/drive/v3/reference/files/list
   * @returns {Promise<Object[]>} Array of Google Drive file objects
   * @private
   * @memberOf app.Drive
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
      return Promise.reject(_getError(_ERR.GET_FILES, reason));
    });
  }

  /**
   * Create a zip file in our app folder
   * @param {string} filename
   * @param {{}} appProps - metadata
   * @param {app.Zip.Data} data
   * @returns {Promise<string>} file id
   * @private
   * @memberOf app.Drive
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
      return Promise.resolve(response.result.id);
    }, (reason) => {
      return Promise.reject(_getError(_ERR.CREATE, reason));
    });
  }

  /**
   * Delete a file in our app folder
   * @param {string} fileId
   * @returns {Promise<void>}
   * @private
   * @memberOf app.Drive
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
      return Promise.reject(_getError(_ERR.DELETE, reason));
    });
  }

  /**
   * Get a file's content from our app folder
   * @param {string} fileId
   * @returns {Promise<app.Zip.Data>}
   * @private
   * @memberOf app.Drive
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
      const data = _csvToIntArray(response.body);
      return Promise.resolve(data);
    }, (reason) => {
      return Promise.reject(_getError(_ERR.GET, reason));
    });
  }

  /**
   * Event: called when document and resources are loaded<br />
   * Load gapi
   * @private
   * @memberOf app.Drive
   */
  function _onLoad() {
    const script = document.createElement('script');
    script.src = '../libs/client.js';
    script.async = false;

    script.onload = function() {
      gapi.load('client', function() {
        gapi.client.load('drive', 'v3', function() {
        });
      });
    };

    document.head.appendChild(script);
  }

  // listen for document and resources loaded
  addEventListener('load', _onLoad);

  return {

    /**
     * Get the list of files in our app folder
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<Array>} Array of Drive files metadata
     * @memberOf app.Drive
     */
    getFiles: function(interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return _getAuthorization(interactive).then(() => {
        return _getFiles();
      }).then((files) => {
        files = files || [];
        return Promise.resolve(files);
      });
    },

    /**
     * Make sure the user has added the Drive scope
     * @returns {Promise<void>}
     * @memberOf app.Drive
     */
    addScope: function() {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return _getAuthorization(true).then(() => {
        return Promise.resolve();
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

      return _getAuthorization(interactive).then(() => {
        return _createZipFile(filename, appProps, data);
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

      return _getAuthorization(interactive).then(() => {
        return _getZipFileContents(fileId);
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

      return _getAuthorization(interactive).then(() => {
        return _deleteFile(fileId);
      }).catch((err) => {
        if (eatError) {
          // unfortunate, but OK
          Chrome.Log.error(err.message, 'Drive.deleteFile');
          return Promise.resolve();
        }
        return Promise.reject(err);
      });
    },
  };
})(window);
