(function() {
	'use strict';

	/**
	 * Content script to monitor clipboard copy and cuts
	 * @namespace ContentScript
	 */

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
