/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
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
  t.pagesOne = [
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
  t.pagesTwo = [
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
   * Array of {@link Main.page} objects for the {@link Label} objects
   * @type {Main.page[]}
   * @memberOf Main
   */
  t.pagesLabels = [];

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
  let prevRoute = '';

  /**
   * Route to use on tab highlight, blank keep current
   * @type {string}
   * @memberOf Main
   */
  let onHighlightRoute = '';

  /**
   * Event: Template Bound, bindings have resolved and content has been
   * stamped to the page
   * @memberOf Main
   */
  function _onDomChange() {
    // concatenate all the pages for the main menu
    _buildPages().then(() => {
      // initialize menu states
      _setDevicesMenuState();
      _setErrorMenuState();

      // select menu
      t.$.mainMenu.select(t.route);

      return Promise.resolve();
    }).catch((err) => {
      Chrome.Log.error(err.message, 'Main._buildPages');
    });

    // listen for Chrome messages
    Chrome.Msg.listen(_onChromeMessage);

    // listen for changes to localStorage
    addEventListener('storage', _onStorageChanged, false);

    // listen for changes to chrome.storage
    chrome.storage.onChanged.addListener(_onChromeStorageChanged);

    // listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', _onSWMessage);

    // listen for changes to highlighted tabs
    chrome.tabs.onHighlighted.addListener(_onHighlighted);

    // check for optional permissions
    _checkOptionalPermissions();
  }

  /**
   * Event: Document and resources loaded
   * @memberOf Main
   */
  function _onLoad() {
    // track usage
    Chrome.GA.page('/main.html');

    const db = app.DB.get();

    db.labels.hook('creating', function(primKey, obj) {
      // eslint-disable-next-line no-invalid-this
      this.onsuccess = function() {
        const name = obj.name;
        if (_getPagesLabelsIdx(name) === -1) {
          const newPage = {
            label: name, route: `page-main-labeled#${name}`,
            icon: 'myicons:label', ready: true, divider: false,
            obj: null, insertion: null, el: null,
          };
          pages.push(newPage);
          t.push('pagesLabels', newPage);
        }
      };
    });

    db.labels.hook('updating', function(mods, primKey, obj) {
      // eslint-disable-next-line no-invalid-this
      this.onsuccess = function() {
        if (mods.hasOwnProperty('name')) {
          // 'name' property is being updated
          if (typeof mods.name === 'string') {
            // change not delete
            const name = obj.name;
            const newName = mods.name;
            const idx = _getPagesLabelsIdx(name);
            t.set(`pagesLabels.${idx}.label`, newName);
          }
        }
      };
    });

    db.labels.hook('deleting', function(primKey, obj) {
      // eslint-disable-next-line no-invalid-this
      this.onsuccess = function() {
        const name = obj.name;
        let idx = pages.findIndex((page) => {
          return page.label === name;
        });
        pages.splice(idx, 1);
        idx = t.pagesLabels.findIndex((page) => {
          return page.label === name;
        });
        t.splice('pagesLabels', idx, 1);
      };
    });
  }

  /**
   * Event: navigation menu selected
   * @param {Event} event
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
        t.$.mainPage.setLabelFilter();
        t.route = page.route;
      } else if (page.route.includes('page-main-labeled#')) {
        // a filtered page-main
        t.$.mainPage.setLabelFilter(page.label);
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
    }
  };

  /**
   * Event: display error dialog
   * @param {Event} event
   * @memberOf Main
   */
  t._onShowErrorDialog = function(event) {
    t.dialogTitle = event.detail.title;
    t.dialogText = event.detail.text;
    t.$.errorDialog.open();
  };

  /**
   * Event: Selected {@link Main.page} changed
   * @param {Event} event
   * @memberOf Main
   */
  t._onPageChanged = function(event) {
    if (event.srcElement !== t.$.animatedPages) {
      return;
    }
    
    // leaving page
    switch (prevRoute) {
      case 'page-main':
        t.$.mainPage.onLeavePage();
        break;
      default:
        break;
    }
    
    // entering page
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
   * Event: Sort the label pages alphabetically
   * @param {Main.page} pageA
   * @param {Main.page} pageB
   * @returns {int} 0 if same, -1 if lower, 1 if higher
   * @memberOf Main
   */
  t._onSortLabelPages = function(pageA, pageB) {
    const a = pageA.label.toLowerCase();
    const b = pageB.label.toLowerCase();
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  };

  /**
   * Computed Binding: Determine content script permission status string
   * @param {string} permissions - current setting
   * @returns {string}
   * @memberOf Main
   */
  t._computePermissionsStatus = function(permissions) {
    return `Current Status: ${permissions}`;
  };

  /**
   * Computed Binding: Determine if avatar should be visible
   * @param {string} avatar - photo url
   * @returns {string} display type
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
   * @param {Event} event
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
        Chrome.GA.error(err.message, 'Main._onSWMessage');
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
   * Event: Fired when the highlighted or selected tabs in a window changes.
   * @see https://developer.chrome.com/extensions/tabs#event-onHighlighted
   * @param {Object} highlightInfo - info
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
      Chrome.GA.error(err.message, 'Main._onHighlighted');
    });
  }

  /**
   * Set the route from onHighlightRoute
   * @memberOf Main
   */
  function _setHighlightRoute() {
    if (Chrome.Utils.isWhiteSpace(onHighlightRoute)) {
      // don't change route
      // if sign-in page is current, give it a chance to recheck its permissions
      if (t.route === 'page-signin') {
        const idx = _getPageIdx(t.route);
        const page = pages[idx];
        page.el.onCurrentPage();
      }
      return;
    }

    prevRoute = t.route;
    const idx = _getPageIdx(onHighlightRoute);
    const page = pages[idx];
    if (onHighlightRoute === 'page-main') {
      t.$.mainPage.setLabelFilter();
    } else {
      _showPage(page);
    }
    t.route = onHighlightRoute;
    t.$.mainMenu.select(onHighlightRoute);
    _scrollPageToTop();
    onHighlightRoute = '';
  }

  /**
   * Get the index into the {@link Main.pages} array
   * @param {string} route - {@link Main.page} route
   * @returns {int} index into array, -1 if not found
   * @memberOf Main
   */
  function _getPageIdx(route) {
    return pages.findIndex((page) => {
      return page.route === route;
    });
  }

  /**
   * Get the index into the label pages array
   * @param {string} label - {@link Main.page} route
   * @returns {int} index into array, -1 if not found
   * @memberOf Main
   */
  function _getPagesLabelsIdx(label) {
    return t.pagesLabels.findIndex((page) => {
      return page.label === label;
    });
  }

  /**
   * Show a {@link Main.page}
   * @param {Main.page} page
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
      t.route = page.route;
      _scrollPageToTop();
    } else {
      page.obj();
    }
  }

  /**
   * Display dialog to prompt for accepting optional permissions
   * if it has not been set yet
   * @memberOf Main
   */
  function _checkOptionalPermissions() {
    if (Chrome.Storage.get('permissions') === app.Permissions.NOT_SET) {
      _showPermissionsDialog();
    }
  }

  /**
   * Show the permissions dialog
   * @memberOf Main
   */
  function _showPermissionsDialog() {
    t.$.permissionsDialog.open();
  }

  /**
   * Scroll Main Panel to top
   * @memberOf Main
   */
  function _scrollPageToTop() {
    t.$.mainPanel.scroller.scrollTop = 0;
  }

  /**
   * Close drawer if drawerPanel is narrow
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
   * @returns {Promise<void>}
   * @memberOf Main
   */
  function _buildPages() {
    pages = t.pagesOne;
    return _getLabelPages().then((labelPages) => {
      labelPages = labelPages || [];
      t.set('pagesLabels', labelPages);
      pages = pages.concat(t.pagesLabels);
      pages = pages.concat(t.pagesTwo);
      return Promise.resolve();
    });
  }

  /**
   * Build the menu items for {@link Label} objects
   * @returns {Promise<Main.page[]>}
   * @memberOf Main
   */
  function _getLabelPages() {
    return app.Label.loadAll().then((labels) => {
      labels = labels || [];
      const pages = [];
      labels.forEach((label) => {
        pages.push({
          label: label.name, route: `page-main-labeled#${label.name}`,
          icon: 'myicons:label', ready: true, divider: false,
          obj: null, insertion: null, el: null,
        });
      });
      return Promise.resolve(pages);
    });
  }

  /**
   * Set enabled state of Devices menu item
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

  // listen for documents and resources loaded
  window.addEventListener('load', _onLoad);
})(window);
