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
   * @property {Chrome.Msg.Message} RESTORE_DEFAULTS - restore default settings
   * @property {Chrome.Msg.Message} HIGHLIGHT - highlight a tab
   * @property {Chrome.Msg.Message} STORE - save value to storage
   * @property {Chrome.Msg.Message} REMOVE_DEVICE - a {@link Device} was
   *     removed from {@link app.Devices}
   * @property {Chrome.Msg.Message} DEVICES_CHANGED - list of {@link
   *     app.Devices} changed
   * @property {Chrome.Msg.Message} PING - ping our {@link app.Devices}
   * @property {Chrome.Msg.Message} COPY_TO_CLIPBOARD - copy {@link
   *     app.ClipItem} to clipboard
   * @property {Chrome.Msg.Message} COPIED_TO_CLIPBOARD - {@link app.ClipItem}
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
   * @property {Chrome.Msg.Message} CLIP_ADDED - a {@link app.ClipItem} was
   *     added or updated
   * @property {Chrome.Msg.Message} CLIP_REMOVED - a {@link app.ClipItem} was
   *     deleted
   * @property {Chrome.Msg.Message} RELOAD_DB - reload the {@link app.ClipItem}
   * database
   * @const
   * @memberOf app.ChromeMsg
   */
  const _MSG = {
    RESTORE_DEFAULTS: {
      message: 'restoreDefaults',
    },
    HIGHLIGHT: {
      message: 'highlightTab',
    },
    STORE: {
      message: 'store',
      key: '',
      value: '',
    },
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
    CLIP_ADDED: {
      message: 'clipAdded',
      item: '',
      updated: false,
    },
    CLIP_REMOVED: {
      message: 'clipRemoved',
      item: '',
    },
    RELOAD_DB: {
      message: 'reloadDB',
    },
  };

  return {
    RESTORE_DEFAULTS: _MSG.RESTORE_DEFAULTS,
    HIGHLIGHT: _MSG.HIGHLIGHT,
    STORE: _MSG.STORE,
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
    CLIP_ADDED: _MSG.CLIP_ADDED,
    CLIP_REMOVED: _MSG.CLIP_REMOVED,
    RELOAD_DB: _MSG.RELOAD_DB,
  };
})();
