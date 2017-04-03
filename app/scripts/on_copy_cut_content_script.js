(function() {
	'use strict';

	/**
	 * Content script to monitor clipboard copy and cuts
	 * @namespace ContentScript
	 */

	if (window.injected) {
		// every other attempt to inject but first
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
	document.addEventListener('copy', onMyCopy, true);
	document.addEventListener('cut', onMyCopy, true);
})();
