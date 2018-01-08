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
   * Scopes required for drive - override manifest values<br />
   * Note: Changing the scopes will create a new Auth token, so we will have two
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
   * Our app folder
   * @type {string}
   * @private
   * @memberOf app.Drive
   */
  const _APP_FOLDER = 'appDataFolder';

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
    GET_FILES: 'Failed to get list of backups from Google Drive.\n',
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
      spaces: [_APP_FOLDER],
      fields: 'files(id, name, modifiedTime, appProperties)',
    };

    return gapi.client.drive.files.list(request).then((response) => {
      return Promise.resolve(response.result.files);
    }, (reason) => {
      return Promise.reject(_getError(_ERR.GET_FILES, reason));
    });
  }

  /**
   * Create or update a zip file in our app folder
   * @param {?string} fileId - if null create new file, otherwise update
   * @param {string} filename
   * @param {{}} appProps - metadata
   * @param {app.Zip.Data} data
   * @returns {Promise<string>} file id
   * @private
   * @memberOf app.Drive
   */
  function _createOrUpdateZipFile(fileId, filename, appProps, data) {
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelim = '\r\n--' + boundary + '--';

    const contentType = 'application/zip';
    
    // PATCH if existing, POST if creating
    const method = fileId ? 'PATCH' : 'POST';
    
    // add fileId if updating
    let path = '/upload' + _FILES_PATH;
    if (fileId) {
      path += fileId;
    }

    const metadata = {
      name: filename,
      mimeType: contentType,
      appProperties: appProps,
    };
    if (!fileId) {
      // create in appFolder
      metadata.parents = [_APP_FOLDER];
    }

    // need to do base64
    // https://stackoverflow.com/a/34731665/4468645
    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' + '\r\n' +
        data +
        closeDelim;

    const request = {
      path: path,
      method: method,
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
      return Promise.resolve(response.body);
    }, (reason) => {
      return Promise.reject(_getError(_ERR.GET, reason));
    });
  }

  /**
   * Event: called when document and resources are loaded
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
     * OAuth2.0 scopes required for drive access
     * @memberOf app.Drive
     */
    SCOPES: _SCOPES,
    
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
     * Get the list of files in our app folder
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<Array>} Array of Drive file's metadata
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
        return _createOrUpdateZipFile(null, filename, appProps, data);
      });
    },

    /**
     * Update a zip file in our app folder
     * @param {string} fileId
     * @param {string} name - filename
     * @param {{}} appProps - metadata
     * @param {app.Zip.Data} data - data bytes
     * @param {boolean} [interactive=false] - if true, user initiated
     * @returns {Promise<string>} file id
     * @memberOf app.Drive
     */
    updateZipFile: function(fileId, name, appProps, data, interactive = false) {
      if (!app.Utils.isSignedIn()) {
        return Promise.reject(new Error(_ERR.NO_SIGNIN));
      }

      return _getAuthorization(interactive).then(() => {
        return _createOrUpdateZipFile(fileId, name, appProps, data);
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
