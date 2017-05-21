/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */

/**
 * Content script to monitor clipboard copy and cuts
 * @namespace
 */
(function() {
	'use strict';

	new ExceptionHandler();

	if (window.onMyCopy) {
		window.removeEventListener('copy', window.onMyCopy);
		window.removeEventListener('cut', window.onMyCopy);
	}

	/**
	 * On copy or cut event, send a message to our extension
	 * @memberOf ContentScript
	 */
	window.onMyCopy = function onMyCopy() {
		try {
			chrome.runtime.sendMessage(chrome.runtime.id, {
				message: 'copiedToClipboard',
			}, () => {});
		} catch(ex) {
			// noinspection UnnecessaryReturnStatementJS
			return;
		}
	};

	window.addEventListener('copy', window.onMyCopy);
	window.addEventListener('cut', window.onMyCopy);
})();
