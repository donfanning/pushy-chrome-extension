/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle calls to the  Google App Engine Endpoints
 * @see https://cloud.google.com/appengine/docs/standard/java/endpoints/
 * @namespace
 */
app.Gae = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Base path of real gae server
   * @const
   * @default
   * @private
   * @memberOf app.Gae
   */
  const GAE_ROOT_REMOTE = 'https://clip-man.appspot.com/_ah/api';

  // noinspection Eslint,JSUnusedLocalSymbols
  /**
   * Base path of local testing server
   * @const
   * @default
   * @private
   * @memberOf app.Gae
   */
      // eslint-disable-next-line no-unused-vars
  const GAE_ROOT_LOCAL = 'http://localhost:8080/_ah/api';

  // Set to GAE_ROOT_LOCAL for local testing
  // noinspection UnnecessaryLocalVariableJS
  const GAE_ROOT = GAE_ROOT_REMOTE;

  return {
    /**
     *  Root path to our gae server
     * @type {string}
     * @memberOf app.Gae
     */
    GAE_ROOT: GAE_ROOT,

    /**
     * Perform POST request to endpoint
     * @param {string} url - server Endpoint
     * @param {boolean} retryToken - if true,
     * retry with new token on error
     * @param {boolean} [interactive=false] - true if user initiated
     * @returns {Promise.<void>} void
     * @memberOf app.Gae
     */
    doPost: function(url, retryToken = false, interactive = false) {
      const conf = Chrome.JSONUtils.shallowCopy(Chrome.Http.conf);
      conf.isAuth = true;
      conf.retryToken = retryToken;
      conf.interactive = interactive;
      return Chrome.Http.doPost(url, conf).then((json) => {
        if (json.success) {
          return Promise.resolve();
        } else {
          return Promise.reject(new Error(json.reason));
        }
      });
    },
  };
})();
