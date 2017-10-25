/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Chrome messages for the extension
 * @namespace
 */
app.ChromeMsg = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Chrome Messages
   * @type {{}}
   * @property {Chrome.Msg.Message} REMOVE_DEVICE - a {@link Device} was
   *     removed from {@link app.Devices}
   * @property {Chrome.Msg.Message} DEVICES_CHANGED - list of {@link
   *     app.Devices} changed
   * @property {Chrome.Msg.Message} PING - ping our {@link app.Devices}
   * @property {Chrome.Msg.Message} COPY_TO_CLIPBOARD - copy {@link ClipItem}
   * to clipboard
   * @property {Chrome.Msg.Message} COPIED_TO_CLIPBOARD - {@link ClipItem}
   *     copied to clipboard
   * @property {Chrome.Msg.Message} SIGN_IN - {@link app.User} sign in
   * @property {Chrome.Msg.Message} SIGN_OUT - {@link app.User} sign out
   * @property {Chrome.Msg.Message} FORCE_SIGN_OUT - {@link app.User} sign out
   * but don't unregister
   * @property {Chrome.Msg.Message} MSG_FAILED - send {@link app.Msg} failed
   * @property {Chrome.Msg.Message} REGISTER_FAILED - register with server
   *     failed
   * @property {Chrome.Msg.Message} UNREGISTER_FAILED - unregister with server
   *     failed
   * @property {Chrome.Msg.Message} CLIP_ITEM_CREATED - new clip created
   * @property {Chrome.Msg.Message} CLIP_ITEM_DELETED - clip deleted
   * @property {Chrome.Msg.Message} CLIP_ITEM_UPDATED - existing clip updated
   * @const
   * @memberOf app.ChromeMsg
   */
  const _MSG = {
    REMOVE_DEVICE: {
      message: 'removeDevice',
      item: '',
    },
    DEVICES_CHANGED: {
      message: 'devicesChanged',
    },
    PING: {
      message: 'ping',
    },
    COPY_TO_CLIPBOARD: {
      message: 'copyToClipboard',
      item: '',
    },
    COPIED_TO_CLIPBOARD: {
      message: 'copiedToClipboard',
    },
    SIGN_IN: {
      message: 'signIn',
    },
    SIGN_OUT: {
      message: 'signOut',
    },
    FORCE_SIGN_OUT: {
      message: 'forceSignOut',
    },
    MSG_FAILED: {
      message: 'sendMessageFailed',
    },
    REGISTER_FAILED: {
      message: 'registerFailed',
    },
    UNREGISTER_FAILED: {
      message: 'unregisterFailed',
    },
    CLIP_ITEM_CREATED: {
      message: 'clipItemCreated',
      item: '',
    },
    CLIP_ITEM_DELETED: {
      message: 'clipItemDeleted',
      item: '',
    },
    CLIP_ITEM_UPDATED: {
      message: 'clipItemUpdated',
      item: '',
    },
  };

  return {
    REMOVE_DEVICE: _MSG.REMOVE_DEVICE,
    DEVICES_CHANGED: _MSG.DEVICES_CHANGED,
    PING: _MSG.PING,
    COPY_TO_CLIPBOARD: _MSG.COPY_TO_CLIPBOARD,
    COPIED_TO_CLIPBOARD: _MSG.COPIED_TO_CLIPBOARD,
    SIGN_IN: _MSG.SIGN_IN,
    SIGN_OUT: _MSG.SIGN_OUT,
    FORCE_SIGN_OUT: _MSG.FORCE_SIGN_OUT,
    MSG_FAILED: _MSG.MSG_FAILED,
    REGISTER_FAILED: _MSG.REGISTER_FAILED,
    UNREGISTER_FAILED: _MSG.UNREGISTER_FAILED,
    CLIP_ITEM_CREATED: _MSG.CLIP_ITEM_CREATED,
    CLIP_ITEM_DELETED: _MSG.CLIP_ITEM_DELETED,
    CLIP_ITEM_UPDATED: _MSG.CLIP_ITEM_UPDATED,
  };
})();
