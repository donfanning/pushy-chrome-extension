/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle optional permissions
 *  @namespace
 */
app.Permissions = (function() {
	'use strict';

	new ExceptionHandler();

	/** @memberOf app.Permissions */
	const PERMISSIONS = ['tabs'];
	/** @memberOf app.Permissions */
	const ORIGINS = ['http://*/*', 'https://*/*'];

	/** @memberOf app.Permissions */
	const NOT_SET = 'notSet';
	/** @memberOf app.Permissions */
	const ALLOWED = 'allowed';
	/** @memberOf app.Permissions */
	const DENIED = 'denied';

	return {
		/** @memberOf app.Permissions */
		NOT_SET: NOT_SET,
		/** @memberOf app.Permissions */
		ALLOWED: ALLOWED,
		/** @memberOf app.Permissions */
		DENIED: DENIED,

		/**
		 * Has use made choice on permissions
		 * @returns {boolean} true if allowed or denied
		 * @memberOf app.Permissions
		 */
		notSet: function() {
			return app.Utils.get('permissions') === NOT_SET;
		},

		/**
		 * Has the user allowed the optional permissions
		 * @returns {boolean} true if allowed
		 * @memberOf app.Permissions
		 */
		isAllowed: function() {
			return app.Utils.get('permissions') === ALLOWED;
		},

		/**
		 * Prompt for the optional permissions
		 * @returns {Promise<boolean>} true if permission granted
		 * @memberOf app.Permissions
		 */
		request: function() {
			const chromep = new ChromePromise();
			return chromep.permissions.request({
				permissions: PERMISSIONS,
				origins: ORIGINS,
			}).then((granted) => {
				if (granted) {
					app.Utils.set('permissions', app.Permissions.ALLOWED);
					return Promise.resolve(granted);
				} else {
					// remove if it has been previously granted
					return app.Permissions.remove().then(() => {
						return Promise.resolve(false);
					});
				}
			});
		},

		/**
		 * Determine if we have the optional permissions
		 * @returns {Promise<boolean>} true if we have permissions
		 * @memberOf app.Permissions
		 */
		contains: function() {
			const chromep = new ChromePromise();
			return chromep.permissions.contains({
				permissions: PERMISSIONS,
				origins: ORIGINS,
			});
		},

		/**
		 * Remove the optional permissions
		 * @returns {Promise<boolean>} true if removed
		 * @memberOf app.Permissions
		 */
		remove: function() {
			app.Utils.set('permissions', app.Permissions.DENIED);
			const chromep = new ChromePromise();
			return app.Permissions.contains().then((contains) => {
				if (contains) {
					return chromep.permissions.remove({
						permissions: PERMISSIONS,
						origins: ORIGINS,
					}).then((removed) => {
						return Promise.resolve(removed);
					});
				} else {
					return Promise.resolve(false);
				}
			});
		},

		/**
		 * Inject our script into all tabs that match
		 * @private
		 * @memberOf app.Permissions
		 */
		injectContentScripts: function() {
			// noinspection JSCheckFunctionSignatures
			if (app.Permissions.isAllowed()) {
				chrome.windows.getAll({populate: true}, function(windows) {
					for (let i = 0; i < windows.length; i++) {
						// all windows
						const win = windows[i];
						for (let j = 0; j < win.tabs.length; j++) {
							// all tabs in window
							const tab = win.tabs[j];
							// our matches
							if (tab.url.match(/(http|https):\/\//gi)) {
								app.Permissions.injectContentScript(tab.id);
							}
						}
					}
				});
			}
		},

		/**
		 * Inject our script into the given tab
		 * @param {int} tabId - tab to inject
		 * @private
		 * @memberOf app.Permissions
		 */
		injectContentScript: function(tabId) {
			if (app.Permissions.isAllowed()) {
				chrome.tabs.executeScript(tabId, {
					file: 'scripts/on_copy_cut_content_script.js',
					allFrames: true,
					matchAboutBlank: true,
				}, function() {
					if (chrome.runtime.lastError) {
						// noinspection UnnecessaryReturnStatementJS
						return;
					}
				});
			}
		},
	};
})();
