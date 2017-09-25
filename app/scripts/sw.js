/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
(function() {
  'use strict';

  /**
   * Service Worker to handle push notifications
   * @namespace ServiceWorker
   */

  /**
   * Fake fetch base path
   * @const
   * @type {string}
   * @memberOf ServiceWorker
   */
  const URL_FETCH_BASE = 'https://pushy-clipboard.github.io/?';

  /**
   * Google search base path
   * @const
   * @type {string}
   * @memberOf ServiceWorker
   */
  const URL_SEARCH_BASE = 'https://www.google.com/search?q=';

  /**
   * Path to extension's main page
   * @const
   * @type {string}
   * @memberOf ServiceWorker
   */
  const URL_EXT =
      'chrome-extension://jemdfhaheennfkehopbpkephjlednffd/html/main.html';

  /** @memberOf ServiceWorker */
  const TAG_MESSAGE = 'tag-message';
  /** @memberOf ServiceWorker */
  const TAG_DEVICE = 'tag-device';

  /** @memberOf ServiceWorker */
  const ACTION_MESSAGE = 'm';
  /** @memberOf ServiceWorker */
  const ACTION_DEVICE_REMOVED = 'remove_our_device';

  /** @memberOf ServiceWorker */
  const IC_REMOTE_COPY = '../images/ic_remote_copy.png';
  /** @memberOf ServiceWorker */
  const IC_ADD_DEVICE = '../images/ic_add_device.png';
  /** @memberOf ServiceWorker */
  const IC_REMOVE_DEVICE = '../images/ic_remove_device.png';
  /** @memberOf ServiceWorker */
  const IC_SEARCH = '../images/search-web.png';

  /** @memberOf ServiceWorker */
  const FAKE_FETCH_DONE = 'Fake fetch done';

  /**
   * Temporary variable to help get all messages at Chrome start-up
   * Normally, can't use globals in service worker, but this is
   * only used when Chrome first starts up. Pretty sure it won't be
   * stopped during this time
   * could use indexedDB if we really have to
   * @memberOf ServiceWorker
   */
  let msgArr = [];

  /**
   * Service Worker Events
   * @typedef {Event} SWEvent
   * @property {Function} waitUntil(Promise) - wait till promise returns
   * @property {Object} notification - notification
   * @property {Object} action - notification action
   * @memberOf ServiceWorker
   */

  /**
   * Get the name of the Device who sent the message
   * @param {app.Msg.GaeMsg} data - message object
   * @returns {string} device name
   * @memberOf ServiceWorker
   */
  function getDeviceName(data) {
    let name;
    if (data.dN) {
      name = data.dN;
    } else {
      name = `${data.dM} - ${data.dSN} - ${data.dOS}`;
    }
    return name;
  }

  /**
   * Get the tag for the notification
   * @param {app.Msg.GaeMsg} data - message object
   * @returns {string} notification tag
   * @memberOf ServiceWorker
   */
  function getTag(data) {
    let tag = TAG_DEVICE;
    if (data.act === ACTION_MESSAGE) {
      tag = TAG_MESSAGE;
    }
    return tag;
  }

  /**
   * Get the icon for the notification
   * @param {app.Msg.GaeMsg} data - message object
   * @returns {string} path to icon
   * @memberOf ServiceWorker
   */
  function getIcon(data) {
    let path = IC_ADD_DEVICE;
    if (data.act === ACTION_MESSAGE) {
      path = IC_REMOTE_COPY;
    } else if (data.act === ACTION_DEVICE_REMOVED) {
      path = IC_REMOVE_DEVICE;
    }
    return path;
  }

  /**
   * Post a message about the page route to display
   * @param {Object} client - our client window
   * @param {string} icon - notification icon
   * @returns {Promise<void>} void
   * @memberOf ServiceWorker
   */
  function postRouteMessage(client, icon) {
    return client.postMessage({
      message: 'route',
      route: getPageRoute(icon),
    });
  }

  /**
   * Get the page route from the icon
   * @param {string} icon - notification icon
   * @returns {string} path to icon
   * @memberOf ServiceWorker
   */
  function getPageRoute(icon) {
    let page = 'page-devices';
    if (icon.includes('ic_remote_copy.png')) {
      page = 'page-main';
    }
    return page;
  }

  /**
   * Send any data attached to a notification to the extension
   * @param {app.Msg.GaeMsg[]} dataArray
   * - possible array of {@link app.Msg.GaeMsg} objects
   * @returns {Promise<void>} always resolves
   * @memberOf ServiceWorker
   */
  function sendNotificationData(dataArray) {
    if (dataArray instanceof Array) {
      return doFakeFetch(dataArray).catch(() => {});
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Send fake GET request so extension can intercept it and get the payload
   * @see https://bugs.chromium.org/p/chromium/issues/detail?id=452942
   * @param {app.Msg.GaeMsg[]} dataArray Array of {@link app.Msg.GaeMsg} objects
   * @returns {Promise<void>} fails if extension successfully canceled request
   * @memberOf ServiceWorker
   */
  function doFakeFetch(dataArray) {
    msgArr = [];
    let URL_FETCH = URL_FETCH_BASE + JSON.stringify(dataArray);
    URL_FETCH = encodeURI(URL_FETCH);
    return fetch(URL_FETCH, {method: 'GET'}).catch(() => {
      return Promise.reject(new Error(FAKE_FETCH_DONE));
    });
  }

  /**
   * Event: Received push message
   * @param {SWEvent} event - the event
   * @memberOf ServiceWorker
   */
  function onPushReceived(event) {
    const payload = event.data.json();
    const data = payload.data;
    let body;
    try {
      body = decodeURIComponent(data.m);
    } catch (ex) {
      // noinspection BadExpressionStatementJS
      () => {};
    }
    const tag = getTag(data);
    const noteOpt = {
      requireInteraction: (tag === TAG_MESSAGE),
      body: body,
      icon: getIcon(data),
      tag: tag,
      timestamp: Date.now(),
      data: null,
    };
    if ((tag === TAG_MESSAGE)) {
      // add web search action for regular messages
      noteOpt.actions = [
        {
          action: 'search',
          title: 'Search web',
          icon: IC_SEARCH,
        }];
    }
    let title = `From: ${getDeviceName(data)}`;

    const promiseChain =
      self.registration.getNotifications({tag: tag}).then((notifications) => {
        if ((notifications.length > 0)) {
          // append to existing displayed notification
          noteOpt.renotify = true;
          const noteData = notifications[0].data;
          if (noteData instanceof Array) {
            // data is in the notification
            // add current and send all to extension
            noteData.push(data);
            // eslint-disable-next-line promise/no-nesting
            return sendNotificationData(noteData).then(() => {
              title = `\n${noteData.length} new items`;
              // set data back to item count
              noteOpt.data = noteData.length;
              // simulate doFakeFetch cancel error
              throw new Error(FAKE_FETCH_DONE);
            });
          } else {
            // count of notifications
            noteOpt.data = notifications[0].data + 1;
            title = `${noteOpt.data} new items`;
          }
        } else {
          // new notification
          noteOpt.data = 1;
        }
        // send data to extension
        return doFakeFetch([data]);
      }).then(() => {
        // Extension did not cancel the fake fetch
        // add data to the notification instead
        // this is necessary for Chrome OS at startup at least
        if (tag === TAG_MESSAGE) {
          msgArr.push(data);
          if (msgArr.length > 1) {
            title += `\n${msgArr.length} new items`;
          }
          // shallow copy
          noteOpt.data = JSON.parse(JSON.stringify(msgArr));
        }
        return self.registration.showNotification(title, noteOpt);
      }).catch((err) => {
        if (err.message === FAKE_FETCH_DONE) {
          // This is the normal outcome of the extension canceling
          // the fake fetch
          return self.registration.showNotification(title, noteOpt);
        }
        console.error('Unexpected error in push event: ', err);
        return Promise.reject(err);
      });

    event.waitUntil(promiseChain);
  }

  /**
   * Event: Notification clicked.
   * @param {SWEvent} event - the event
   * @memberOf ServiceWorker
   */
  function onNotificationClick(event) {
    event.notification.close();

    if (event.action === 'search') {
      // clicked on search action
      if (clients.openWindow) {
        const searchUrl =
            URL_SEARCH_BASE + encodeURIComponent(event.notification.body);
        clients.openWindow(searchUrl);
      }
      return;
    }

    let wClients;
    const promiseChain = clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    }).then((windowClients) => {
      wClients = windowClients;
      return sendNotificationData(event.notification.data);
    }).then(() => {
      for (let i = 0; i < wClients.length; i++) {
        const client = wClients[i];
        if ((client.url === URL_EXT) && 'focus' in client) {
          // tab exists
          // Send a message to the client to route to correct page
          return postRouteMessage(client, event.notification.icon);
        }
      }

      if (clients.openWindow) {
        // create our main page
        return clients.openWindow(URL_EXT);
      }
      return Promise.resolve();
    }).catch(() => {});

    event.waitUntil(promiseChain);
  }

  /**
   * Event: Notification closed - can't open or focus window here.
   * @param {SWEvent} event - the event
   * @memberOf ServiceWorker
   */
  function onNotificationClose(event) {
    event.waitUntil(
        sendNotificationData(event.notification.data).catch(() => {}));
  }

  // Listen for install events
  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });

  // Listen for activate events
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

  // Listen for push events
  self.addEventListener('push', onPushReceived);

  // Listen for notificationclick events
  self.addEventListener('notificationclick', onNotificationClick);

  // Listen for notificationclose events
  self.addEventListener('notificationclose', onNotificationClose);
})();
