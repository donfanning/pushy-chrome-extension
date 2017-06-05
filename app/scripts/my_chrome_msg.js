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
   * Restore default settings
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const RESTORE_DEFAULTS = {
    message: 'restoreDefaults',
  };

  /**
   * Highlight a tab
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const HIGHLIGHT = {
    message: 'highlightTab',
  };

  /**
   * A save attempt to localStorage exceeded its capacity
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const STORAGE_EXCEEDED = {
    message: 'storageExceeded',
  };

  /**
   * Save value to storage message
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const STORE = {
    message: 'store',
    key: '',
    value: '',
  };

  /**
   * A {@link app.Device} was removed from the {@link app.Devices}
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const REMOVE_DEVICE = {
    message: 'removeDevice',
    item: '',
  };

  /**
   * The list of {@link app.Devices} changed
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const DEVICES_CHANGED = {
    message: 'devicesChanged',
  };

  /**
   * Ping our {@link app.Devices}
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const PING = {
    message: 'ping',
  };

  /**
   * Copy the item to the clipboard
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const COPY_TO_CLIPBOARD = {
    message: 'copyToClipboard',
    item: '',
  };

  /**
   * We copied something to the clipboard
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const COPIED_TO_CLIPBOARD = {
    message: 'copiedToClipboard',
  };

  /**
   * User signed in
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const SIGN_IN = {
    message: 'signIn',
  };

  /**
   * User signed OUT
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const SIGN_OUT = {
    message: 'signOut',
  };

  /**
   * Send {@link app.Msg} failed
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const MSG_FAILED = {
    message: 'sendMessageFailed',
  };

  /**
   * Register with server failed
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const REGISTER_FAILED = {
    message: 'registerFailed',
  };

  /**
   * Unregister with server failed
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const UNREGISTER_FAILED = {
    message: 'unregisterFailed',
  };

  /**
   * A {@link app.ClipItem} was added or updated
   * @type {Chrome.Msg.Message}
   * @memberOf app.ChromeMsg
   */
  const CLIP_ADDED = {
    message: 'clipAdded',
    item: '',
    updated: false,
  };

  return {
    RESTORE_DEFAULTS: RESTORE_DEFAULTS,
    HIGHLIGHT: HIGHLIGHT,
    STORAGE_EXCEEDED: STORAGE_EXCEEDED,
    STORE: STORE,
    REMOVE_DEVICE: REMOVE_DEVICE,
    DEVICES_CHANGED: DEVICES_CHANGED,
    PING: PING,
    COPY_TO_CLIPBOARD: COPY_TO_CLIPBOARD,
    COPIED_TO_CLIPBOARD: COPIED_TO_CLIPBOARD,
    SIGN_IN: SIGN_IN,
    SIGN_OUT: SIGN_OUT,
    MSG_FAILED: MSG_FAILED,
    REGISTER_FAILED: REGISTER_FAILED,
    UNREGISTER_FAILED: UNREGISTER_FAILED,
    CLIP_ADDED: CLIP_ADDED,
  };
})();
