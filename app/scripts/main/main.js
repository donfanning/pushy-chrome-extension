/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

(function() {
  'use strict';

  /**
   * Script for the main.html page
   *  @namespace Main
   */

  new ExceptionHandler();

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
      'https://play.google.com/store/apps/details' +
      '?id=com.weebly.opus1269.clipman';

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
   * @type {Object}
   * @memberOf Main
   */
  const t = document.querySelector('#t');

  /**
   * Manage an html page that is inserted on demand<br>
   * May also be a url link to external site
   * @typedef page
   * @type {Object}
   * @property {string} label - label for Nav menu
   * @property {string} route - element name route to page
   * @property {string} icon - icon for Nav Menu
   * @property {?Object|Function} obj - something to be done when selected
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
    {
      label: 'Main', route: 'page-main',
      icon: 'myicons:list', obj: null,
      ready: true, disabled: false, divider: false,
    },
    {
      label: 'Manage account', route: 'page-signin',
      icon: 'myicons:account-circle', obj: _showSignInPage,
      ready: false, disabled: false, divider: false,
    },
    {
      label: 'Manage devices', route: 'page-devices',
      icon: 'myicons:phonelink', obj: _showDevicesPage,
      ready: false, disabled: false, divider: false,
    },
    {
      label: 'Settings', route: 'page-settings',
      icon: 'myicons:settings', obj: _showSettingsPage,
      ready: false, disabled: false, divider: false,
    },
    {
      label: 'Manage optional permissions', route: 'page-permissions',
      icon: 'myicons:perm-data-setting', obj: _showPermissionsDialog,
      ready: true, disabled: false, divider: false,
    },
    {
      label: 'Help & feedback', route: 'page-help',
      icon: 'myicons:help', obj: _showHelpPage,
      ready: false, disabled: false, divider: false,
    },
    {
      label: 'Get android app', route: 'page-android',
      icon: 'myicons:android', obj: ANDROID_URI,
      ready: true, disabled: false, divider: true,
    },
    {
      label: 'Rate extension', route: 'page-rate',
      icon: 'myicons:grade', obj: `${EXT_URI}reviews`,
      ready: true, disabled: false, divider: false,
    },
    {
      label: 'Try Photo Screen Saver', route: 'page-screensaver',
      icon: 'myicons:extension', obj: SCREEN_SAVER_URI,
      ready: true, disabled: false, divider: true,
    },
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
   * Content Script permission
   * @type {string}
   * @memberOf Main
   */
  t.permissions = Chrome.Storage.get('permissions');

  /**
   * User photo
   * @type {string}
   * @memberOf Main
   */
  t.avatar = Chrome.Storage.get('photoURL');

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
   *  Listen for template bound event to know when bindings
   *  have resolved and content has been stamped to the page
   */
  t.addEventListener('dom-change', () => {
    // track usage
    Chrome.GA.page('/main.html');
    // disable devices-page if not signed in
    const idx = _getPageIdx('page-devices');
    t.pages[idx].disabled = !app.Utils.isSignedIn();
    // listen for Chrome messages
    Chrome.Msg.listen(_onChromeMessage);
    // check for permissions
    _checkPermissions();
  });

  /**
   * Event: navigation menu selected
   * @param {Event} event - event
   * @memberOf Main
   */
  t.onNavMenuItemTapped = function(event) {
    // Close drawer after menu item is selected
    _closeDrawer();

    prevRoute = t.route;

    const idx = _getPageIdx(event.currentTarget.id);

    Chrome.GA.event(Chrome.GA.EVENT.MENU, t.pages[idx].route);

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
   * @param {Event} event - event
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
   * Event: Clicked on accept permissions dialog button
   * @memberOf Main
   */
  t.onAcceptPermissionsClicked = function() {
    app.Permissions.request().then((granted) => {
      t.permissions = Chrome.Storage.get('permissions');
      if (granted) {
        app.Permissions.injectContentScripts();
      }
      return Promise.resolve();
    }).catch((err) => {
      Chrome.GA.error(err.message, 'Main.onAcceptPermissionsClicked');
    });
  };

  /**
   * Event: Clicked on deny permissions dialog button
   * @memberOf Main
   */
  t.onDenyPermissionsClicked = function() {
    app.Permissions.remove().then(() => {
      t.permissions = Chrome.Storage.get('permissions');
      return Promise.resolve();
    }).catch((err) => {
      Chrome.GA.error(err.message, 'Main.onDenyPermissionsClicked');
    });
  };

  /**
   * Computed Binding: Determine content script permission status string
   * @param {string} permissions - current setting
   * @returns {string} display type
   * @memberOf Main
   */
  t.computePermissionsStatus = function(permissions) {
    return `Current Status: ${permissions}`;
  };

  /**
   * Computed Binding: Determine if avatar should be visible
   * @param {string} avatar - photo url
   * @returns {string} display type
   * @memberOf Main
   */
  t.computeAvatarDisplay = function(avatar) {
    let ret = 'inline';
    if (Chrome.Utils.isWhiteSpace(avatar)) {
      ret = 'none';
    }
    return ret;
  };

  // noinspection JSUnusedLocalSymbols
  /**
   * Event: Fired when a message is sent from either an extension process<br>
   * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
   * @see https://developer.chrome.com/extensions/runtime#event-onMessage
   * @param {Chrome.Msg.Message} request - details for the
   * @param {Object} sender - MessageSender object
   * @param {function} response - function to call once after processing
   * @private
   * @memberOf Main
   */
  function _onChromeMessage(request, sender, response) {
    if (request.message === app.ChromeMsg.HIGHLIGHT.message) {
      // highlight ourselves and let the sender know we are here
      const chromep = new ChromePromise();
      chromep.tabs.getCurrent().then((t) => {
        chrome.tabs.update(t.id, {'highlighted': true});
        return Promise.resolve();
      }).catch((err) => {
        Chrome.GA.error(err.message, 'chromep.tabs.getCurrent');
      });
      response(JSON.stringify({message: 'OK'}));
    } else if (request.message === app.ChromeMsg.MSG_FAILED.message) {
      t.dialogTitle = 'Failed to send push notification';
      t.dialogText = request.error;
      t.$.errorDialog.open();
    }
  }

  /**
   * Event: Fired when item in localStorage changes
   * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
   * @param {Event} event - storage event
   * @param {string} event.key - value that changed
   * @private
   * @memberOf Main
   */
  function _onStorageChanged(event) {
    if (event.key === 'signedIn') {
      _setDevicesState();
    } else if (event.key === 'photoURL') {
      t.avatar = Chrome.Storage.get('photoURL');
    }
  }

  /**
   * Event: Fired when the highlighted or selected tabs in a window changes.
   * @see https://developer.chrome.com/extensions/tabs#event-onHighlighted
   * @param {Object} highlightInfo - info
   * @private
   * @memberOf Main
   */
  function _onHighlighted(highlightInfo) {
    const tabIds = highlightInfo.tabIds;
    chrome.tabs.getCurrent(function(myTab) {
      for (let i = 0; i < tabIds.length; i++) {
        const tabId = tabIds[i];
        if (tabId === myTab.id) {
          // our tab
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
   * Display dialog to prompt for accepting optional permissions
   * if it has not been set yet
   * @memberOf Main
   * @private
   */
  function _checkPermissions() {
    if (Chrome.Storage.get('permissions') === app.Permissions.NOT_SET) {
      _showPermissionsDialog();
    }
  }

  /**
   * Get the index into the {@link Main.pages} array
   * @param {string} name - {@link Main.page} route
   * @returns {int} index into array
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
   * @param {int} index - index into {@link Main.pages}
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
   * @param {int} index -  - index into {@link Main.pages}
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
   * @param {int} index - index into {@link Main.pages}
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
   * @param {int} index - index into {@link Main.pages}
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
   * Show the permissions dialog
   * @private
   * @memberOf Main
   */
  function _showPermissionsDialog() {
    t.$.permissionsDialog.open();
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
