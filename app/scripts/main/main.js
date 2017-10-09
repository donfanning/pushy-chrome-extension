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
   * @namespace Main
   */

  new ExceptionHandler();

  const chromep = new ChromePromise();

  /**
   * Path to the extension in the Web Store
   * @type {string}
   * @const
   * @memberOf Main
   */
  const EXT_URI =
      `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/`;

  /**
   * Path to the android app in the Play Store
   * @type {string}
   * @const
   * @memberOf Main
   */
  const ANDROID_URI =
      'https://play.google.com/store/apps/details' +
      '?id=com.weebly.opus1269.clipman';

  /**
   * Path to my screen saver extension
   * @type {string}
   * @const
   * @memberOf Main
   */
  const SCREEN_SAVER_URI =
      'https://chrome.google.com/webstore/detail/photo-screen-saver/' +
      'kohpcmlfdjfdggcjmjhhbcbankgmppgc';

  /**
   * Auto-binding template
   * @type {Object}
   * @const
   * @memberOf Main
   */
  const t = document.querySelector('#t');

  /**
   * Manage an html page that is inserted on demand<br>
   * May also be a url link to external site
   * @typedef {{}} Main.page
   * @property {string} label - label for Nav menu
   * @property {string} route - element name route to page
   * @property {string} icon - icon for Nav Menu
   * @property {?Object|Function} obj - something to be done when selected
   * @property {boolean} ready - true if html is inserted
   * @property {?Function} factory - function to build page
   * @property {?string} insertion - id of insertion point
   * @property {?Element} el - Polymer element
   * @property {boolean} divider - true for divider before item
   * @memberOf Main
   */

  /**
   * Array of {@link Main.page} objects
   * @type {Main.page[]}
   * @const
   * @memberOf Main
   */
  t.pages_one = [
    {
      label: 'Clips', route: 'page-main',
      icon: 'myicons:content-paste', ready: true, divider: false,
      obj: null, insertion: null, el: null,
    },
    {
      label: 'Manage account', route: 'page-signin',
      icon: 'myicons:account-circle', ready: false, divider: false,
      obj: app.SignInPageFactory, insertion: 'signInInsertion', el: null,
    },
    {
      label: 'Manage devices', route: 'page-devices',
      icon: 'myicons:phonelink', ready: false, divider: false,
      obj: app.DevicesPageFactory, insertion: 'devicesInsertion', el: null,
    },
    {
      label: 'Manage labels', route: 'page-labels',
      icon: 'myicons:label', ready: false, divider: false,
      obj: app.LabelsPageFactory, insertion: 'labelsInsertion', el: null,
    },
  ];

  /**
   * Array of {@link Main.page} objects
   * @type {Main.page[]}
   * @const
   * @memberOf Main
   */
  t.pages_two = [
    {
      label: 'Settings', route: 'page-settings',
      icon: 'myicons:settings', ready: false, divider: true,
      obj: app.SettingsPageFactory, insertion: 'settingsInsertion', el: null,
    },
    {
      label: 'Manage optional permissions', route: 'page-permissions',
      icon: 'myicons:perm-data-setting', ready: true, divider: false,
      obj: _showPermissionsDialog, insertion: null, el: null,
    },
    {
      label: 'View last error', route: 'page-error',
      icon: 'myicons:error', ready: false, divider: false,
      obj: app.ErrorPageFactory, insertion: 'errorInsertion', el: null,
    },
    {
      label: 'Help & feedback', route: 'page-help',
      icon: 'myicons:help', ready: false, divider: true,
      obj: app.HelpPageFactory, insertion: 'helpInsertion', el: null,
    },
    {
      label: 'Get android app', route: 'page-android',
      icon: 'myicons:android', ready: true, divider: false, el: null,
      obj: ANDROID_URI, insertion: null,
    },
    {
      label: 'Rate extension', route: 'page-rate',
      icon: 'myicons:grade', ready: true, divider: false,
      obj: `${EXT_URI}reviews`, insertion: null, el: null,
    },
    {
      label: 'Try Photo Screen Saver', route: 'page-screensaver',
      icon: 'myicons:extension', ready: true, divider: true,
      obj: SCREEN_SAVER_URI, insertion: null, el: null,
    },
  ];

  /**
   * Array of {@link Main.page} objects for the {@link app.Label} objects
   * @type {Main.page[]}
   * @memberOf Main
   */
  t.pages_labels = [];

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
   * Array concatenation of {@link Main.page} objects
   * @type {Main.page[]}
   * @alias Main.pages
   * @memberOf Main
   */
  let pages = [];

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
   * Event: Template Bound, bindings have resolved and content has been
   * stamped to the page
   * @private
   * @memberOf Main
   */
  function _onDomChange() {
    // track usage
    Chrome.GA.page('/main.html');

    // concatenate all the pages for the main menu
    _buildPages().then(() => {
      // initialize menu states
      _setDevicesMenuState();
      _setErrorMenuState();
      
      // select menu
      t.$.mainMenu.select(t.route);
      
      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message,
          'Main._buildPages', 'Failed tp build menu.');
    });
    
    // listen for Chrome messages
    Chrome.Msg.listen(_onChromeMessage);

    // listen for changes to localStorage
    addEventListener('storage', _onStorageChanged, false);

    // listen for changes to chrome.storage
    chrome.storage.onChanged.addListener(_onChromeStorageChanged);

    // listen for changes to database
    app.DB.get().on('changes', _onDBChanged);

    // listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', _onSWMessage);

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
    const page = pages[idx];

    Chrome.GA.event(Chrome.GA.EVENT.MENU, page.route);

    if (!page.obj) {
      // some pages are just pages
      if (page.route === 'page-main') {
        t.$.mainPage.setLabelName('');
        t.route = page.route;
      } else if (page.route.includes('page-main-labeled')) {
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
      _showPage(page);
      t.route = page.route;
      _scrollPageToTop();
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
   * Event: A {@link Main.page} finished animating in
   * @private
   * @memberOf Main
   */
  t._onPageAnimation = function() {
    const idx = _getPageIdx(t.route);
    const page = pages[idx];
    switch (t.route) {
      case 'page-main':
        t.$.mainPage.onCurrentPage();
        break;
      case 'page-signin':
      case 'page-devices':
      case 'page-labels':
        page.el.onCurrentPage();
        break;
      default:
        break;
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
   * Event: Fired when changes occur in Chrome.storage
   * @see https://developer.chrome.com/apps/storage
   * @param {Array} changes - storage changes
   * @private
   * @memberOf Main
   */
  function _onChromeStorageChanged(changes) {
    for (const change in changes) {
      if (changes.hasOwnProperty(change)) {
        if (change === 'lastError') {
          _setErrorMenuState();
          break;
        }
      }
    }
  }

  /**
   * Event: Fired when changes occur in the Dexie database
   * @see http://dexie.org/docs/Observable/Dexie.Observable.html
   * @param {Array} changes - database changes
   * @private
   * @memberOf Main
   */
  function _onDBChanged(changes) {
    changes.forEach(function(change) {
      switch (change.type) {
        case 1: // CREATED
          if (change.table === 'labels') {
            const name = change.obj.name;
            const suffix = t.pages_labels.length;
            const newPage = {
              label: name, route: `page-main-labeled${suffix}`,
              icon: 'myicons:label', ready: true, divider: false,
              obj: null, insertion: null, el: null,
            };
            pages.push(newPage);
            t.push('pages_labels', newPage);
          }
          break;
        case 2: // UPDATED
          if (change.table === 'labels') {
            const name = change.oldObj.name;
            const newName = change.obj.name;
            const idx = t.pages_labels.findIndex((page) => {
              return page.label === name;
            });
            t.set(`pages_labels.${idx}.label`, newName);
          }
          break;
        case 3: // DELETED
          if (change.table === 'labels') {
            const name = change.oldObj.name;
            let idx = pages.findIndex((page) => {
              return page.label === name;
            });
            pages.splice(idx, 1);
            idx = t.pages_labels.findIndex((page) => {
              return page.label === name;
            });
            t.splice('pages_labels', idx, 1);
          }
          break;
        default:
          break;
      }
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
    const page = pages[idx];
    if (onHighlightRoute === 'page-main') {
      t.$.mainPage.setLabelName('');
      if ((prevRoute === 'page-main')) {
        t.$.mainPage.updateDates();
      }
    } else {
      _showPage(page);
    }
    t.route = onHighlightRoute;
    t.$.mainMenu.select(onHighlightRoute);
    _scrollPageToTop();
    onHighlightRoute = 'page-main';
  }

  /**
   * Get the index into the {@link Main.pages} array
   * @param {string} route - {@link Main.page} route
   * @returns {int} index into array, -1 if not found
   * @private
   * @memberOf Main
   */
  function _getPageIdx(route) {
    return pages.findIndex((page) => {
      return page.route === route;
    });
  }

  /**
   * Show a {@link Main.page}
   * @param {Main.page} page - a {@link Main.page}
   * @private
   * @memberOf Main
   */
  function _showPage(page) {
    if (page.insertion) {
      if (!page.ready) {
        // insert the page the first time
        page.ready = true;
        // eslint-disable-next-line new-cap
        page.el = new page.obj();
        const insertEl = document.getElementById(page.insertion);
        Polymer.dom(insertEl).appendChild(page.el);
      }
    } else {
      page.obj();
    }
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
   * @returns {Promise<void>} void
   * @private
   * @memberOf Main
   */
  function _buildPages() {
    pages = t.pages_one;
    return _getLabelPages().then((labelPages) => {
      labelPages = labelPages || [];
      t.set('pages_labels', labelPages);
      pages = pages.concat(t.pages_labels);
      pages = pages.concat(t.pages_two);
      return Promise.resolve();
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
          label: label.name, route: `page-main-labeled${count}`,
          icon: 'myicons:label', ready: true, divider: false,
          obj: null, insertion: null, el: null,
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
    const el = document.getElementById(pages[idx].route);
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
      const el = document.getElementById(pages[idx].route);
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
