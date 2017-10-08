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

  const chromep = new ChromePromise();

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
   * @alias Main.pages_one
   */
  t.pages_one = [
    {
      label: 'Clips', route: 'page-main',
      icon: 'myicons:content-paste', obj: null,
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
      label: 'Manage labels', route: 'page-labels',
      icon: 'myicons:label', obj: _showLabelsPage,
      ready: false, disabled: false, divider: false,
    },
  ];

  /**
   * Array of {@link Main.page} objects
   * @type {Main.page[]}
   * @memberOf Main
   * @alias Main.pages_two
   */
  t.pages_two = [
    {
      label: 'Settings', route: 'page-settings',
      icon: 'myicons:settings', obj: _showSettingsPage,
      ready: false, disabled: false, divider: true,
    },
    {
      label: 'Manage optional permissions', route: 'page-permissions',
      icon: 'myicons:perm-data-setting', obj: _showPermissionsDialog,
      ready: true, disabled: false, divider: false,
    },
    {
      label: 'View last error', route: 'page-error',
      icon: 'myicons:error', obj: _showErrorPage,
      ready: false, disabled: false, divider: false,
    },
    {
      label: 'Help & feedback', route: 'page-help',
      icon: 'myicons:help', obj: _showHelpPage,
      ready: false, disabled: false, divider: true,
    },
    {
      label: 'Get android app', route: 'page-android',
      icon: 'myicons:android', obj: ANDROID_URI,
      ready: true, disabled: false, divider: false,
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
   * Array of {@link Main.page} objects for the {@link Label} objects
   * @type {Main.page[]}
   * @memberOf Main
   * @alias Main.pages_labels
   */
  t.pages_labels;
  
  /**
   * Array concatenation of {@link Main.page} objects
   * @type {Main.page[]}
   * @memberOf Main
   * @alias Main.pages
   */
  t.pages;
  
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
   * Route to use on tab highlight
   * @type {string}
   * @memberOf Main
   */
  let onHighlightRoute = 'page-main';

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
   * lebels-page element
   * @type {element}
   * @memberOf Main
   */
  let labelsPage;

  /**
   * Event: Template Bound, bindings have resolved and content has been
   * stamped to the page
   * @private
   * @memberOf Main
   */
  function _onDomChange() {
    // track usage
    Chrome.GA.page('/main.html');

    // concatenate all the pages
    _buildPages();

    // listen for Chrome messages
    Chrome.Msg.listen(_onChromeMessage);

    // initialize menu states
    let idx = _getPageIdx('page-devices');
    t.pages[idx].disabled = !app.Utils.isSignedIn();
    _setErrorMenuState();

    // listen for changes to chrome.storage
    chrome.storage.onChanged.addListener(function(changes) {
      for (const key in changes) {
        if (changes.hasOwnProperty(key)) {
          if (key === 'lastError') {
            _setErrorMenuState();
            break;
          }
        }
      }
    });

    // listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', _onSWMessage);

    // listen for changes to localStorage
    addEventListener('storage', _onStorageChanged, false);

    // listen for changes to highlighted tabs
    chrome.tabs.onHighlighted.addListener(_onHighlighted);

    // check for optional permissions
    _checkOptionalPermissions();
  }
  
  /**
   * Event: navigation menu selected
   * @param {Event} event - event
   * @private
   * @memberOf Main
   */
  t._onNavMenuItemTapped = function(event) {
    // Close drawer after menu item is selected
    _closeDrawer();

    prevRoute = t.route;

    const idx = _getPageIdx(event.currentTarget.id);
    const page = t.pages[idx];

    Chrome.GA.event(Chrome.GA.EVENT.MENU, page.route);

    if (!page.obj) {
      // some pages are just pages
      if (page.route === 'page-main') {
        t.$.mainPage.setLabelName('');
        t.route = page.route;
      } else if (page.route.includes('page-label')) {
        t.$.mainPage.setLabelName(page.label);
        t.route = 'page-main';
      } else {
        t.route = page.route;
      }
      _scrollPageToTop();
    } else if (typeof page.obj === 'string') {
      // some pages are url links
      t.$.mainMenu.select(prevRoute);
      chrome.tabs.create({url: page.obj});
    } else {
      // some pages have functions to view them
      page.obj(idx);
    }
  };

  /**
   * Event: display error dialog
   * @param {Event} event - event
   * @private
   * @memberOf Main
   */
  t._onShowErrorDialog = function(event) {
    t.dialogTitle = event.detail.title;
    t.dialogText = event.detail.text;
    t.$.errorDialog.open();
  };

  /**
   * Event: {@link Main.page} finished animating in
   * @private
   * @memberOf Main
   */
  t._onPageAnimation = function() {
    if (t.route === 'page-main') {
      t.$.mainPage.onCurrentPage();
    } else if (t.route === 'page-signin') {
      signInPage.onCurrentPage();
    } else if (t.route === 'page-devices') {
      devicesPage.onCurrentPage();
    } else if (t.route === 'page-labels') {
      labelsPage.onCurrentPage();
    }
  };

  /**
   * Event: Clicked on accept permissions dialog button
   * @private
   * @memberOf Main
   */
  t._onAcceptPermissionsClicked = function() {
    app.Permissions.request().then((granted) => {
      t.permissions = Chrome.Storage.get('permissions');
      if (granted) {
        app.Permissions.injectContentScripts();
      }
      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message, 'Main._onAcceptPermissionsClicked');
    });
  };

  /**
   * Event: Clicked on deny permissions dialog button
   * @private
   * @memberOf Main
   */
  t._onDenyPermissionsClicked = function() {
    app.Permissions.remove().then(() => {
      t.permissions = Chrome.Storage.get('permissions');
      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message, 'Main._onDenyPermissionsClicked');
    });
  };

  /**
   * Computed Binding: Determine content script permission status string
   * @param {string} permissions - current setting
   * @returns {string} display type
   * @private
   * @memberOf Main
   */
  t._computePermissionsStatus = function(permissions) {
    return `Current Status: ${permissions}`;
  };

  /**
   * Computed Binding: Determine if avatar should be visible
   * @param {string} avatar - photo url
   * @returns {string} display type
   * @private
   * @memberOf Main
   */
  t._computeAvatarDisplay = function(avatar) {
    let ret = 'inline';
    if (Chrome.Utils.isWhiteSpace(avatar)) {
      ret = 'none';
    }
    return ret;
  };

  /**
   * Event: Fired when a message is posted from out service worker
   * @param {Event} event - the event
   * @private
   * @memberOf Main
   */
  function _onSWMessage(event) {
    if (event.data.message === 'route') {
      // highlight ourselves if needed, and set the current route
      onHighlightRoute = event.data.route;
      chromep.tabs.getCurrent().then((tab) => {
        if (!tab.highlighted) {
          chromep.tabs.update(tab.id, {'highlighted': true});
        } else {
          // already highlighted, set route
          _setHighlightRoute();
        }
        return Promise.resolve();
      }).catch((err) => {
        Chrome.Log.error(err.message, 'Main._onSWMessage');
      });
    }
  }
  
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
    if (request.message === Chrome.Msg.HIGHLIGHT.message) {
      onHighlightRoute = request.item;
      // highlight ourselves and let the sender know we are here
      chromep.tabs.getCurrent().then((tab) => {
        if (!tab.highlighted) {
          chromep.tabs.update(tab.id, {'highlighted': true});
        } else {
          // already highlighted, set route
          _setHighlightRoute();
        }
        return Promise.resolve();
      }).catch((err) => {
        Chrome.Log.error(`${request.message}: ${err.message}`,
            'chromep.tabs.getCurrent');
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
      _setDevicesMenuState();
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
    chromep.tabs.getCurrent().then((tab) => {
      for (let i = 0; i < tabIds.length; i++) {
        const tabId = tabIds[i];
        if (tabId === tab.id) {
          // our tab
          _setHighlightRoute();
          break;
        }
      }
      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message, 'Main._onHighlighted');
    });
  }

  /**
   * Set the route from onHighlightRoute
   * @private
   * @memberOf Main
   */
  function _setHighlightRoute() {
    prevRoute = t.route;
    const idx = _getPageIdx(onHighlightRoute);
    const page = t.pages[idx];
    if (!page.ready) {
      // insert and show
      page.obj(idx);
    } else {
      // select it
      t.route = onHighlightRoute;
    }
    t.$.mainMenu.select(onHighlightRoute);
    if ((prevRoute === 'page-main') && (t.route === 'page-main')) {
      t.$.mainPage.updateDates();
    }
    onHighlightRoute = 'page-main';
  }

  /**
   * Display dialog to prompt for accepting optional permissions
   * if it has not been set yet
   * @memberOf Main
   * @private
   */
  function _checkOptionalPermissions() {
    if (Chrome.Storage.get('permissions') === app.Permissions.NOT_SET) {
      _showPermissionsDialog();
    }
  }

  /**
   * Get the index into the {@link Main.pages} array
   * @param {string} route - {@link Main.page} route
   * @returns {int} index into array, -1 if not found
   * @private
   * @memberOf Main
   */
  function _getPageIdx(route) {
    return t.pages.findIndex((page) => {
      return page.route === route;
    });
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
   * @param {int} index - index into {@link Main.pages}
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
   * Show the labels page
   * @param {int} index - index into {@link Main.pages}
   * @private
   * @memberOf Main
   */
  function _showLabelsPage(index) {
    if (!t.pages[index].ready) {
      // insert the page the first time
      t.pages[index].ready = true;
      labelsPage = new app.LabelsPageFactory();
      Polymer.dom(t.$.labelsInsertion).appendChild(labelsPage);
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
   * Show the error viewer page
   * @param {int} index - index into {@link Main.pages}
   * @private
   * @memberOf Main
   */
  function _showErrorPage(index) {
    if (!t.pages[index].ready) {
      // insert the page the first time
      t.pages[index].ready = true;
      const el = new app.ErrorPageFactory();
      Polymer.dom(t.$.errorInsertion).appendChild(el);
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
   * Build the menu items
   * @private
   * @memberOf Main
   */
  function _buildPages() {
    t.pages = t.pages_one;
    _getLabelPages().then((pages) => {
      pages = pages || [];
      t.set('pages_labels', pages);
      t.pages = t.pages.concat(t.pages_labels);
      t.pages = t.pages.concat(t.pages_two);
      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message, 'Main._buildPages', 'Failed to build menu');
    });
  }
  
  /**
   * Build the menu items for {@link app.Label} objects
   * @returns {Promise<Main.page[]>} array of pages
   * @private
   * @memberOf Main
   */
  function _getLabelPages() {
    return app.Label.loadAll().then((labels) => {
      labels = labels || [];
      const pages = [];
      let count = 0;
      labels.forEach((label) => {
        pages.push({
          label: label.name, route: `page-label${count}`,
          icon: 'myicons:label', obj: null,
          ready: true, disabled: false, divider: false,
        });
        count++;
      });
      return Promise.resolve(pages);
    });
  }
  
  /**
   * Set enabled state of Devices menu item
   * @private
   * @memberOf Main
   */
  function _setDevicesMenuState() {
    // disable devices-page if not signed in
    const idx = _getPageIdx('page-devices');
    const el = document.getElementById(t.pages[idx].route);
    if (el && app.Utils.isSignedIn()) {
      el.removeAttribute('disabled');
    } else if (el) {
      el.setAttribute('disabled', 'true');
    }
  }

  /**
   * Set enabled state of Error Viewer menu item
   * @private
   * @memberOf Main
   */
  function _setErrorMenuState() {
    // disable error-page if no lastError
    Chrome.Storage.getLastError().then((lastError) => {
      const idx = _getPageIdx('page-error');
      const el = document.getElementById(t.pages[idx].route);
      if (el && !Chrome.Utils.isWhiteSpace(lastError.message)) {
        el.removeAttribute('disabled');
      } else if (el) {
        el.setAttribute('disabled', 'true');
      }
      return Promise.resolve();
    }).catch((err) => {
      Chrome.GA.error(err.message, 'Main._setErrorMenuState');
    });
  }

  // listen for dom-change
  t.addEventListener('dom-change', _onDomChange);
})(window);
