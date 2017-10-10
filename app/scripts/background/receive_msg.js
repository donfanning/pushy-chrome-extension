/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
(function() {
  'use strict';

  /**
   * Handle incoming push messages
   * @namespace ReceiveMsg
   */
  new ExceptionHandler();

  /**
   * Delay time for fcm message processing
   * @type {int}
   * @default
   * @const
   * @private
   * @memberOf ReceiveMsg
   */
  const MESSAGE_WAIT_MILLIS = 500;

  /**
   * Get new {@link Device} from {@link app.Msg.GaeMsg}
   * @param {app.Msg.GaeMsg} data - push data
   * @returns {Device} a {@link Device}
   * @private
   * @memberOf ReceiveMsg
   */
  function _getDevice(data) {
    return new app.Device(data.dM, data.dSN, data.dOS, data.dN, Date.now());
  }

  /**
   * Process received push notifications
   * @param {app.Msg.GaeMsg} data - push message
   * @private
   * @memberOf ReceiveMsg
   */
  function _process(data) {
    const device = _getDevice(data);
    if (!app.Utils.isSignedIn() || device.isMe()) {
      // don't handle our messages or if we are signed out
      return;
    }

    Chrome.GA.event(app.GA.EVENT.RECEIVED);

    try {
      data.m = decodeURIComponent(data.m);
    } catch (ex) {
      const msg = `Caught: ReceiveMsg._process ${ex.message}`;
      Chrome.Log.exception(ex, msg);
    }

    if (data.act === app.Msg.ACTION.MESSAGE) {
      // received remote ClipItem
      app.Devices.add(device);
      const fav = (data.fav === '1');
      // persist
      app.ClipItem.add(data.m, Date.now(), fav, true, device.getName(), true).
          catch((err) => {
            Chrome.Log.error(err.message, 'ReceiveMsg._process');
          });
      // save to clipboard
      app.CB.copyToClipboard(data.m);
    } else if (data.act === app.Msg.ACTION.PING) {
      // we were pinged
      app.Devices.add(device);
      // respond to ping
      app.Msg.sendPingResponse(data.srcRegId).catch((err) => {
        app.Msg.sendFailed(err);
      });
    } else if (data.act === app.Msg.ACTION.PING_RESPONSE) {
      // someone is around
      app.Devices.add(device);
    } else if (data.act === app.Msg.ACTION.DEVICE_ADDED) {
      // someone new is here
      app.Devices.add(device);
    } else if (data.act === app.Msg.ACTION.DEVICE_REMOVED) {
      // someone went away
      app.Devices.remove(device);
    }
  }

  /**
   * Event: Fired when a Web request is about to occur.
   * Capture the Service Worker request and process messages
   * @see https://goo.gl/4j4RtY
   * @param {Object} details - details on the request
   * @returns {Object} cancel the request
   * @private
   * @memberOf ReceiveMsg
   */
  function _onWebRequestBefore(details) {
    let url = details.url;
    try {
      url = decodeURI(url);
    } catch (ex) {
      const msg = `Caught: ReceiveMsg._onWebRequestBefore ${ex.message}`;
      Chrome.Log.exception(ex, msg);
    }
    const regex = /https:\/\/pushy-clipboard\.github\.io\/\?(.*)/;
    let text;
    const matches = url.match(regex);
    if (matches && (matches.length > 1)) {
      text = matches[1];
    }
    if (text) {
      let dataArray = null;
      try {
        dataArray = JSON.parse(text);
      } catch (ex) {
        const msg = `Caught: ReceiveMsg._onWebRequestBefore ${ex.message}`;
        Chrome.Log.exception(ex, msg);
      }
      if (dataArray) {
        for (let i = 0; i < dataArray.length; i++) {
          (function(index) {
            setTimeout(function() {
              // slow down message stream
              _process(dataArray[index]);
            }, MESSAGE_WAIT_MILLIS);
          })(i);
        }
      }
      // cancel fake request
      return {cancel: true};
    }
  }

  // Listen for web requests
  chrome.webRequest.onBeforeRequest.addListener(_onWebRequestBefore, {
    urls: ['https://pushy-clipboard.github.io/*'],
  }, ['blocking']);
})();
