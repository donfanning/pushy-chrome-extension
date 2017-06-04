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
app.MyCMsg = (function() {
	'use strict';

	new ExceptionHandler();

	/**
	 * A Chrome message
	 * @typedef {{}} app.MyCMsg.Message
	 * @property {string} message - Unique name
	 * @property {Error} error - an error
	 * @property {string|Object} item - a message specific item
	 * @property {boolean} updated - item is new or updated
	 * @property {string} key - key name
	 * @property {?Object} value - value of key
	 * @memberOf app.MyCMsg
	 */

	/**
	 * Restore default settings
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const RESTORE_DEFAULTS = {
		message: 'restoreDefaults',
	};

	/**
	 * Highlight a tab
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const HIGHLIGHT = {
		message: 'highlightTab',
	};

	/**
	 * A save attempt to localStorage exceeded its capacity
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const STORAGE_EXCEEDED = {
		message: 'storageExceeded',
	};

	/**
	 * Save value to storage message
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const STORE = {
		message: 'store',
		key: '',
		value: '',
	};

	/**
	 * A {@link app.Device} was removed from the {@link app.Devices}
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const REMOVE_DEVICE = {
		message: 'removeDevice',
		item: '',
	};

	/**
	 * The list of {@link app.Devices} changed
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const DEVICES_CHANGED = {
		message: 'devicesChanged',
	};

	/**
	 * Ping our {@link app.Devices}
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const PING = {
		message: 'ping',
	};

	/**
	 * Copy the item to the clipboard
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const COPY_TO_CLIPBOARD = {
		message: 'copyToClipboard',
		item: '',
	};

	/**
	 * We copied something to the clipboard
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const COPIED_TO_CLIPBOARD = {
		message: 'copiedToClipboard',
	};

	/**
	 * User signed in
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const SIGN_IN = {
		message: 'signIn',
	};

	/**
	 * User signed OUT
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const SIGN_OUT = {
		message: 'signOut',
	};

	/**
	 * Send {@link app.Msg} failed
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const MSG_FAILED = {
		message: 'sendMessageFailed',
	};

	/**
	 * Register with server failed
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const REGISTER_FAILED = {
		message: 'registerFailed',
	};

	/**
	 * Unregister with server failed
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
	 */
	const UNREGISTER_FAILED = {
		message: 'unregisterFailed',
	};

	/**
	 * A {@link app.ClipItem} was added or updated
	 * @type {app.MyCMsg.Message}
	 * @memberOf app.MyCMsg
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
