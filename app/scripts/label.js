/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/photo-screen-saver/blob/master/LICENSE.md
 */
(function() {
  'use strict';

  new ExceptionHandler();

  /**
   * A Label for a {@link app.ClipItem}
   * @param {string} name - label name
   * @alias app.Label
   */
  const Label = function(name) {
    this.name = name;
  };
  
  window.app = window.app || {};
  window.app.Label = Label;
})();
