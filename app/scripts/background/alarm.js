/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Manage the chrome.alarm
 * @namespace
 */
app.Alarm = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Alarm types
   * @type {{}}
   * @private
   * @memberOf app.Alarm
   */
  const _ALARM = {
    STORAGE: 'storage',
    BACKUP: 'backup',
  };
  
  /**
   * Event: Fired when an alarm has elapsed.
   * @see https://developer.chrome.com/apps/alarms#event-onAlarm
   * @param {Object} alarm - details on alarm
   * @private
   * @memberOf app.Alarm
   */
  function _onAlarm(alarm) {
    if (alarm.name === _ALARM.STORAGE) {
      Chrome.GA.event(Chrome.GA.EVENT.ALARM, _ALARM.STORAGE);
      app.Alarm.deleteOldClipItems();
    } else if (alarm.name === _ALARM.BACKUP) {
      Chrome.GA.event(Chrome.GA.EVENT.ALARM, _ALARM.BACKUP);
      if (app.Utils.isSignedIn()) {
        app.Backup.doBackup(false).catch((err) => {
          Chrome.Log.error(err.message, 'Alarm._onAlarm',
              'Auto backup failed.');
        });
      }
    }
  }

  /**
   * Event: Fired when item in localStorage changes
   * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
   * @param {Event} event - storage event
   * @param {string} event.key - storage item that changed
   * @private
   * @memberOf app.Alarm
   */
  function _onStorageChanged(event) {
    if ((event.key === 'storageDuration') ||
        (event.key === 'autoBackup')) {
      app.Alarm.updateAlarms();
    }
  }

  /**
   * Event: called when document and resources are loaded
   * @private
   * @memberOf app.Alarm
   */
  function _onLoad() {
    // Listen for alarms
    chrome.alarms.onAlarm.addListener(_onAlarm);
    
    // Listen for changes to localStorage
    addEventListener('storage', _onStorageChanged, false);
  }

  // listen for document and resources loaded
  window.addEventListener('load', _onLoad);

  return {
    /**
     * Set the repeating alarms
     * @memberOf app.Alarm
     */
    updateAlarms: function() {
      
      // delete old clips
      const durationType = Chrome.Storage.getInt('storageDuration', 2);
      if (durationType === 4) {
        // until room is needed
        chrome.alarms.clear(_ALARM.STORAGE);
      } else {
        // Add daily alarm to delete old clipItems
        chrome.alarms.get(_ALARM.STORAGE, (alarm) => {
          if (!alarm) {
            chrome.alarms.create(_ALARM.STORAGE, {
              when: Date.now() + Chrome.Time.MSEC_IN_DAY,
              periodInMinutes: Chrome.Time.MIN_IN_DAY,
            });
          }
        });
      }
      
      // daily backup
      const autoBackup = Chrome.Storage.getBool('autoBackup', false);
      if (autoBackup) {
        // Add daily alarm backup data
        chrome.alarms.get(_ALARM.BACKUP, (alarm) => {
          if (!alarm) {
            chrome.alarms.create(_ALARM.BACKUP, {
              when: Date.now() + Chrome.Time.MSEC_IN_DAY,
              periodInMinutes: Chrome.Time.MIN_IN_DAY,
            });
          }
        });
      } else {
        chrome.alarms.clear(_ALARM.BACKUP);
      }
    },

    /**
     * Delete {@link ClipItem} objects older than the
     * storageDuration setting
     * @memberOf app.Alarm
     */
    deleteOldClipItems: function() {
      app.ClipItem.deleteOld().catch((err) => {
        Chrome.Log.error(err.message, 'Alarm.deleteOldClipItems');
      });
    },
  };
})();


