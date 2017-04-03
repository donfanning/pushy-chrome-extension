/*
 *
 * Copyright 2016 Michael A Updike
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
window.app = window.app || {};
app.Main = (function() {
	'use strict';

	/**
	 * Script for the main.html page
	 *  @namespace Main
	 */

	/**
	 * Path to the extension in the Web Store
	 * @type {string}
	 * @memberOf Main
	 */
	const EXT_URI =
		`https://chrome.google.com/webstore/detail/${chrome.runtime.id}/`;

	/**
	 * Path to the android app in the Play Store
	 * @type {string}
	 * @default
	 * @memberOf Main
	 */
	const ANDROID_URI =
		'https://play.google.com/store/apps/details?' +
		'id=com.weebly.opus1269.clipman';

	/**
	 * Path to my screen saver extension
	 * @type {string}
	 * @default
	 * @memberOf Main
	 */
	const SCREEN_SAVER_URI =
		'https://chrome.google.com/webstore/detail/photo-screen-saver/' +
		'kohpcmlfdjfdggcjmjhhbcbankgmppgc';

	/**
	 * Auto-binding template
	 * @type {object}
	 * @memberOf Main
	 */
	const t = document.querySelector('#t');

	/**
	 * Manage an html page that is inserted on demand<br>
	 * May also be a url link to external site
	 * @typedef page
	 * @type {object}
	 * @property {string} label - label for Nav menu
	 * @property {string} route - element name route to page
	 * @property {string} icon - icon for Nav Menu
	 * @property {object|null} obj - something to be done when selected
	 * @property {boolean} ready - true if html is inserted
	 * @property {boolean} disabled - disabled state of Nav menu
	 * @property {boolean} divider - true for divider before item
	 * @memberOf Main
	 */

	/**
	 * Array of {@link Main.page} objects
	 * @type {Main.page[]}
	 * @memberOf Main
	 * @alias Main.pages
	 */
	t.pages = [
		{label: 'Main', route: 'page-main',
			icon: 'myicons:list', obj: null,
			ready: true, disabled: false, divider: false},
		{label: 'Manage account', route: 'page-signin',
			icon: 'myicons:account-circle', obj: _showSignInPage,
			ready: false, disabled: false, divider: false},
		{label: 'Manage devices', route: 'page-devices',
			icon: 'myicons:phonelink', obj: _showDevicesPage,
			ready: false, disabled: false, divider: false},
		{label: 'Settings', route: 'page-settings',
			icon: 'myicons:settings', obj: _showSettingsPage,
			ready: false, disabled: false, divider: false},
		{label: 'Help & feedback', route: 'page-help',
			icon: 'myicons:help', obj: _showHelpPage,
			ready: false, disabled: false, divider: false},
		{label: 'Get android app', route: 'page-android',
			icon: 'myicons:android', obj: ANDROID_URI,
			ready: true, disabled: false, divider: true},
		{label: 'Rate extension', route: 'page-rate',
			icon: 'myicons:grade', obj: `${EXT_URI}reviews`,
			ready: true, disabled: false, divider: false},
		{label: 'Try Photo Screen Saver', route: 'page-screensaver',
			icon: 'myicons:extension', obj: SCREEN_SAVER_URI,
			ready: true, disabled: false, divider: true},
	];

	/**
	 * Error dialog title
	 * @type {string}
	 * @memberOf Main
	 */
	t.dialogTitle = '';

	/**
	 * Error dialog text
	 * @type {string}
	 * @memberOf Main
	 */
	t.dialogText = '';

	/**
	 * Current route
	 * @type {string}
	 * @memberOf Main
	 */
	t.route = 'page-main';

	/**
	 * User photo
	 * @type {string}
	 * @memberOf Main
	 */
	t.avatar = app.Utils.get('photoURL');

	/**
	 * Previous route
	 * @type {string}
	 * @memberOf Main
	 */
	let prevRoute = 'page-main';

	/**
	 * signin-page element
	 * @type {element}
	 * @memberOf Main
	 */
	let signInPage;

	/**
	 * devices-page element
	 * @type {element}
	 * @memberOf Main
	 */
	let devicesPage;

	/**
	 * Is the mainPage being displayed
	 * @type {boolean}
	 * @memberOf Main
	 */
	let isMainPage = true;

	/**
	 * 	Listen for template bound event to know when bindings
	 * 	have resolved and content has been stamped to the page
	 */
	t.addEventListener('dom-change', () => {
		// disable devices-page if not signed in
		const idx = _getPageIdx('page-devices');
		t.pages[idx].disabled = !app.Utils.isSignedIn();
		// listen for Chrome messages
		chrome.runtime.onMessage.addListener(_onChromeMessage);
	});
	
	/**
	 * Event: navigation menu selected
	 * @param {Event} event
	 * @memberOf Main
	 */
	t.onNavMenuItemTapped = function(event) {
		// Close drawer after menu item is selected
		_closeDrawer();

		prevRoute = t.route;

		const idx = _getPageIdx(event.currentTarget.id);
		if (!t.pages[idx].obj) {
			// some pages are just pages
			t.route = t.pages[idx].route;
			_scrollPageToTop();
		} else if (typeof t.pages[idx].obj === 'string') {
			// some pages are url links
			t.$.mainMenu.select(prevRoute);
			chrome.tabs.create({url: t.pages[idx].obj});
		} else {
			// some pages have functions to view them
			t.pages[idx].obj(idx);
		}

		isMainPage = (t.route === 'page-main');
	};

	/**
	 * Event: display error dialog
	 * @param {Event} event
	 * @memberOf Main
	 */
	t.onShowErrorDialog = function(event) {
		t.dialogTitle = event.detail.title;
		t.dialogText = event.detail.text;
		t.$.errorDialog.open();
	};

	/**
	 * Event: {@link Main.page} finished animating in
	 * @memberOf Main
	 */
	t.onPageAnimation = function() {
		if (t.route === 'page-main') {
			t.$.mainPage.onCurrentPage();
		} else if (t.route === 'page-signin') {
			signInPage.onCurrentPage();
		} else if (t.route === 'page-devices') {
			devicesPage.onCurrentPage();
		}
	};

	/**
	 * Computed Binding: Determine if avatar should be visible
	 * @param {string} avatar - photo url
	 * @return {string} display type
	 * @memberOf Main
	 */
	t.computeAvatarDisplay = function(avatar) {
		let ret = 'inline';
		if (app.Utils.isWhiteSpace(avatar)) {
			ret = 'none';
		}
		return ret;
	};

	// noinspection JSUnusedLocalSymbols
	/**
	 * Event: Fired when a message is sent from either an extension process<br>
	 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
	 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
	 * @param {object} request - details for the message
	 * @param {object} sender - MessageSender object
	 * @param {function} response - function to call once after processing
	 * @private
	 * @memberOf Main
	 */
	function _onChromeMessage(request, sender, response) {
		if (request.message === 'highlightTab') {
			// highlight ourselves and tell the sender we are here
			// noinspection JSCheckFunctionSignatures
			chrome.tabs.getCurrent((tab) => {
				chrome.tabs.update(tab.id, {'highlighted': true});
			});
			response({message: 'OK'});
		} else if (request.message === 'sendMessageFailed') {
			t.dialogTitle = 'Failed to send push notification';
			t.dialogText = request.error;
			t.$.errorDialog.open();
		}
	}

	/**
	 * Event: Fired when item in localStorage changes
	 * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
	 * @param {event} event
	 * @param {string} event.key
	 * @private
	 * @memberOf Main
	 */
	function _onStorageChanged(event) {
		if(event.key === 'signedIn') {
			_setDevicesState();
		} else if(event.key === 'photoURL') {
			t.avatar = app.Utils.get('photoURL');
		}
	}

	/**
	 * Event: Fired when the highlighted or selected tabs in a window changes.
	 * @see https://developer.chrome.com/extensions/tabs#event-onHighlighted
	 * @param {object} highlightInfo
	 * @private
	 * @memberOf Main
	 */
	function _onHighlighted(highlightInfo) {
		const tabIds = highlightInfo.tabIds;
		chrome.tabs.getCurrent(function(tab) {
			for (let i = 0; i < tabIds.length; i++) {
				if (tabIds[i] === tab.id) {
					if (!isMainPage) {
						// focus main page
						prevRoute = t.route;
						t.route = 'page-main';
						isMainPage = true;
						t.$.mainMenu.select(t.route);
					} else {
						t.$.mainPage.updateDates();
					}
					break;
				}
			}
		});
	}

	/**
	 * Get the index into the {@link Main.pages} array
	 * @param {string} name - {@link Main.page} route
	 * @return {int} index into array
	 * @private
	 * @memberOf Main
	 */
	function _getPageIdx(name) {
		return t.pages.map(function(e) {
			return e.route;
		}).indexOf(name);
	}

	/**
	 * Show the signin page
	 * @param {int} index
	 * @private
	 * @memberOf Main
	 */
	function _showSignInPage(index) {
		if (!t.pages[index].ready) {
			// insert the page the first time
			t.pages[index].ready = true;
			signInPage = new app.SignInPageFactory();
			Polymer.dom(t.$.signInInsertion).appendChild(signInPage);
		}
		t.route = t.pages[index].route;
		_scrollPageToTop();
	}

	/**
	 * Show the devices page
	 * @param {int} index
	 * @private
	 * @memberOf Main
	 */
	function _showDevicesPage(index) {
		if (!t.pages[index].ready) {
			// insert the page the first time
			t.pages[index].ready = true;
			devicesPage = new app.DevicesPageFactory();
			Polymer.dom(t.$.devicesInsertion).appendChild(devicesPage);
		}
		t.route = t.pages[index].route;
		_scrollPageToTop();
	}

	/**
	 * Show the settings page
	 * @param {int} index
	 * @private
	 * @memberOf Main
	 */
	function _showSettingsPage(index) {
		if (!t.pages[index].ready) {
			// insert the page the first time
			t.pages[index].ready = true;
			const el = new app.SettingsPageFactory();
			Polymer.dom(t.$.settingsInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		_scrollPageToTop();
	}

	/**
	 * Show the help page
	 * @param {int} index
	 * @private
	 * @memberOf Main
	 */
	function _showHelpPage(index) {
		if (!t.pages[index].ready) {
			// insert the page the first time
			t.pages[index].ready = true;
			const el = new app.HelpPageFactory();
			Polymer.dom(t.$.helpInsertion).appendChild(el);
		}
		t.route = t.pages[index].route;
		_scrollPageToTop();
	}

	/**
	 * Scroll Main Panel to top
	 * @private
	 * @memberOf Main
	 */
	function _scrollPageToTop() {
		t.$.mainPanel.scroller.scrollTop = 0;
	}

	/**
	 * Close drawer if drawerPanel is narrow
	 * @private
	 * @memberOf Main
	 */
	function _closeDrawer() {
		const drawerPanel = document.querySelector('#paperDrawerPanel');
		if (drawerPanel.narrow) {
			drawerPanel.closeDrawer();
		}
	}

	/**
	 * Set enabled state of Devices menu item
	 * @private
	 * @memberOf Main
	 */
	function _setDevicesState() {
		// disable devices-page if not signed in
		const idx = _getPageIdx('page-devices');
		const el = document.getElementById(t.pages[idx].route);
		if (el && app.Utils.isSignedIn()) {
			el.removeAttribute('disabled');
		} else if (el) {
			el.setAttribute('disabled', 'true');
		}
	}

	// listen for changes to localStorage
	addEventListener('storage', _onStorageChanged, false);

	// listen for changes to highlighted tabs
	chrome.tabs.onHighlighted.addListener(_onHighlighted);

})();
