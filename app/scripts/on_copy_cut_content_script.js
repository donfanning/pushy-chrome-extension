'use strict';

/**
 * Content script to monitor clipboard copy and cuts
 *
 * @namespace ContentScript
 */

/**
 * On copy or cut event, send a message to our extension
 *
 * @memberOf ContentScript
 */
function onMyCopy() {
	chrome.runtime.sendMessage(chrome.runtime.id, {
		message: 'copiedToClipboard',
	}, function(response) {});
}

// register event listener for copy and cut events on document
document.addEventListener('copy', onMyCopy, true);
document.addEventListener('cut', onMyCopy, true);
