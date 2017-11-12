/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Send messages to the GAE server MessagingEndpoint for delivery
 * @namespace
 */
app.Msg = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Data packet sent to server
   * @typedef {{}} app.Msg.GaeMsg
   * @property {string} act - type of message
   * @property {string} m - content of message
   * @property {string} dM - {@link Device} model
   * @property {string} dSN - {@link Device} serial number
   * @property {string} dOS - {@link Device} operating system
   * @property {string} dN - {@link Device} nickname
   * @property {string} fav - '1' if favorite item (optional)
   * @property {string} srcRegId - source of ping (optional)
   * @memberOf app.Msg
   */

  /**
   * Base path of MessagingEndpoint
   * @const
   * @private
   * @memberOf app.Msg
   */
  const _URL_BASE = `${app.Gae.GAE_ROOT}/messaging/v1/send/`;

  /**
   * Max message length. Server may reduce it more
   * @const
   * @private
   * @memberOf app.Msg
   */
  const _MAX_MSG_LEN = 4096;

  /**
   * Message action
   * @type {{}}
   * @property {string} MESSAGE
   * @property {string} PING
   * @property {string} PING_RESPONSE
   * @property {string} DEVICE_ADDED
   * @property {string} DEVICE_REMOVED
   * @const
   * @memberOf app.Msg
   */
  const _ACTION = {
    MESSAGE: 'm',
    PING: 'ping_others',
    PING_RESPONSE: 'respond_to_ping',
    DEVICE_ADDED: 'add_our_device',
    DEVICE_REMOVED: 'remove_our_device',
  };

  /**
   * Message body
   * @type {{}}
   * @property {string} PING
   * @property {string} PING_RESPONSE
   * @property {string} DEVICE_ADDED
   * @property {string} DEVICE_REMOVED
   * @const
   * @private
   * @memberOf app.Msg
   */
  const _BODY = {
    PING: 'Contacting other devices...',
    PING_RESPONSE: 'Device is online',
    DEVICE_ADDED: 'New device added',
    DEVICE_REMOVED: 'Device removed',
  };

  /**
   * Get the data packet we will send
   * @param {string} action - message type
   * @param {string} body - message body
   * @returns {app.Msg.GaeMsg}
   * @private
   * @memberOf app.Msg
   */
  function _getData(action, body) {
    const msg = _getDevice();
    msg.act = action;
    msg.m = body;
    return msg;
  }

  /**
   * Get portion of {@link Device} sent in message
   * @returns {{}} Subset of {@link Device} info as object literal
   * @memberOf app.Msg
   */
  function _getDevice() {
    return {
      [app.Device.MODEL]: app.Device.myModel(),
      [app.Device.SN]: app.Device.mySN(),
      [app.Device.OS]: app.Device.myOS(),
      [app.Device.NICKNAME]: app.Device.myNickname(),
    };
  }

  /**
   * Send message to server for delivery to our {@link Devices}
   * @param {app.Msg.GaeMsg} data - data packet
   * @param {boolean} notify - display notification if true
   * @param {?app.Notify.TYPE} type=null - notification type
   * @returns {Promise<void>} void
   * @private
   * @memberOf app.Msg
   */
  function _sendMessage(data, notify, type = null) {
    if (!app.Utils.canSend()) {
      return Promise.resolve();
    }

    let url;
    return app.SW.cantReceive().then((cantReceive) => {
      if (cantReceive) {
        // we don't have a valid regId anymore
        return Promise.resolve('unknownRegId');
      }
      return app.Fb.getRegToken();
    }).then((regId) => {
      const json = encodeURIComponent(JSON.stringify(data));
      const highPriority = Chrome.Storage.getBool('highPriority');
      url = `${_URL_BASE}${regId}/${json}/${highPriority}`;
      return app.Gae.doPost(url, true);
    }).then(() => {
      if (type && notify && app.Notify.onSend()) {
        app.Notify.create(type, data.m);
      }
      Chrome.GA.event(app.GA.EVENT.SENT, data.act);
      return Promise.resolve();
    });
  }

  return {
    ACTION: _ACTION,

    /**
     * Send clipboard contents as represented by a {@link ClipItem}
     * @param {ClipItem} clipItem - contents of clipboard
     * @returns {Promise<void>}
     * @memberOf app.Msg
     */
    sendClipItem: function(clipItem) {
      if (Chrome.Utils.isWhiteSpace(clipItem.text)) {
        return Promise.resolve();
      }

      let text = clipItem.text;
      if (text.length > _MAX_MSG_LEN) {
        // limit message size. Server may limit more
        text = text.substring(0, _MAX_MSG_LEN - 1);
      }

      const data = _getData(_ACTION.MESSAGE, text);
      data.fav = clipItem.fav ? '1' : '0';
      return _sendMessage(data, true, app.Notify.TYPE.MESSAGE_SENT);
    },

    /**
     * Send message for adding our {@link Device}
     * @returns {Promise<void>}
     * @memberOf app.Msg
     */
    sendDeviceAdded: function() {
      const data = _getData(_ACTION.DEVICE_ADDED, _BODY.DEVICE_ADDED);
      return _sendMessage(data, true, app.Notify.TYPE.DEVICE_ADDED);
    },

    /**
     * Send message for removing our {@link Device}
     * @returns {Promise<void>}
     * @memberOf app.Msg
     */
    sendDeviceRemoved: function() {
      const data = _getData(_ACTION.DEVICE_REMOVED, _BODY.DEVICE_REMOVED);
      return _sendMessage(data, true, app.Notify.TYPE.DEVICE_REMOVED);
    },

    /**
     * Ping our {@link app.Devices}
     * @returns {Promise<void>} void
     * @memberOf app.Msg
     */
    sendPing: function() {
      const data = _getData(_ACTION.PING, _BODY.PING);
      return _sendMessage(data, false);
    },

    /**
     * Respond to a ping from a {@link Device}
     * @param {string} srcRegId - source of ping
     * @returns {Promise<void>}
     * @memberOf app.Msg
     */
    sendPingResponse: function(srcRegId) {
      const data = _getData(_ACTION.PING_RESPONSE, _BODY.PING_RESPONSE);
      data.srcRegId = srcRegId;
      return _sendMessage(data, false);
    },

    /**
     * Display notification that send message failed
     * @param {Error} err
     * @memberOf app.Msg
     */
    sendFailed: function(err) {
      Chrome.Log.error(err.message, 'Msg.sendFailed');
      if (app.Notify.onError()) {
        app.Notify.create(app.Notify.TYPE.ERROR_SEND, err.message,
            new Chrome.Storage.LastError());
      }
    },
  };
})();
