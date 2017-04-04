(function() {
	'use strict';

	/**
	 * Content script to monitor clipboard copy and cuts
	 * @namespace ContentScript
	 */

	if (window.injected) {
		// every other attempt to inject but first
		// window may be the top window or an iFrame
		return;
	}
	window.injected = true;

	/**
	 * On copy or cut event, send a message to our extension
	 * @memberOf ContentScript
	 */
	function onMyCopy() {
		chrome.runtime.sendMessage(chrome.runtime.id, {
			message: 'copiedToClipboard',
		}, (response) => {});
	}

	// register event listeners for copy and cut events on document
	window.addEventListener('copy', onMyCopy, true);
	window.addEventListener('cut', onMyCopy, true);
})();
