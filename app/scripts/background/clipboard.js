/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage the clipboard
 * @namespace
 */
app.CB = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Delay time for reading from clipboard
   * @type {int}
   * @default
   * @private
   * @memberOf app.CB
   */
  const WAIT_MILLIS = 250;

  /**
   * Send local {@link ClipItem} push notification if enabled
   * @param {ClipItem} clipItem - {@link ClipItem} to send
   * @private
   * @memberOf app.CB
   */
  function _sendLocalClipItem(clipItem) {
    if (!clipItem.remote && app.Utils.isAutoSend()) {
      // send to our devices
      app.Msg.sendClipItem(clipItem).catch((err) => {
        app.Msg.sendFailed(err);
      });
    }
  }

  /**
   * Add a new {@link ClipItem} from the Clipboard contents
   * @private
   * @memberOf app.CB
   */
  function _addClipItemFromClipboard() {
    if (!app.Utils.isMonitorClipboard()) {
      return;
    }

    // wait a little to make sure clipboard is ready
    setTimeout(function() {
      // get the clipboard contents
      const text = app.CB.getTextFromClipboard();

      // Persist
      app.ClipItem.add(text, Date.now(), false, false,
          app.Device.myName()).then((clipItem) => {
        // send to our devices
        _sendLocalClipItem(clipItem);
        return Promise.resolve();
      }).catch((err) => {
        const msg = err.message;
        if (msg !== app.ClipItem.ERROR_EMPTY_TEXT) {
          Chrome.GA.error(msg, 'CB._addClipItemFromClipboard');
        }
        if (app.Notify.onError()) {
          app.Notify.create(app.Notify.TYPE.ERROR_STORE_CLIP, msg);
        }
      });

    }, WAIT_MILLIS);
  }

  // noinspection JSUnusedLocalSymbols
  /**
   * Event: Fired when a message is sent from either an extension process<br>
   * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
   * @see https://developer.chrome.com/extensions/runtime#event-onMessage
   * @param {Chrome.Msg.Message} request - details for the
   * @param {Object} sender - MessageSender object
   * @param {function} response - function to call once after processing
   * @returns {boolean} true if asynchronous
   * @private
   * @memberOf app.CB
   */
  function _onChromeMessage(request, sender, response) {
    let ret = false;

    if (request.message === app.ChromeMsg.COPIED_TO_CLIPBOARD.message) {
      // we put data on the clipboard
      _addClipItemFromClipboard();
    } else if (request.message === app.ChromeMsg.COPY_TO_CLIPBOARD.message) {
      // copy a ClipItem to the clipboard
      const clip = request.item;
      const clipItem = new app.ClipItem(clip.text, clip.lastSeen, clip.fav,
          clip.remote, clip.device);
      app.CB.copyToClipboard(clipItem.text);
      _sendLocalClipItem(clipItem);
    }
    return ret;
  }

  /**
   * Listen for Chrome messages
   */
  Chrome.Msg.listen(_onChromeMessage);

  return {
    /**
     * Get the text from the clipboard
     * @returns {string} text from clipboard
     * @memberOf app.CB
     */
    getTextFromClipboard: function() {
      const input = document.createElement('textArea');
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand('Paste');
      const text = input.value;
      input.remove();

      return text;
    },

    /**
     * Copy the given text to the clipboard
     * @param {string} text - text to copy
     * @memberOf app.CB
     */
    copyToClipboard: function(text) {
      const input = document.createElement('textArea');
      document.body.appendChild(input);
      input.textContent = text;
      input.focus();
      input.select();
      document.execCommand('Copy');
      input.remove();
    },
  };
})();

