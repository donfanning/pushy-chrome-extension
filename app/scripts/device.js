/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
(function(window) {
  'use strict';

  new ExceptionHandler();

  /**
   * Creates a new Device instance.
   * @constructor
   * @alias Device
   * @param {string} model - The model name of a device
   * @param {string} sn - The serial number (or other descriptor) of a device
   * @param {string} os - The operating system of a device
   * @param {string} nickname - The nickname of a device
   * @param {int} lastSeen - A date in millis from the epoch
   */
  const Device = function(model, sn, os, nickname, lastSeen) {
    this.model = model;
    this.sn = sn;
    this.os = os;
    this.nickname = nickname;
    if (lastSeen) {
      this.lastSeen = lastSeen;
    } else {
      this.lastSeen = Date.now();
    }
  };

  /**
   * Model key
   * @const
   * @default
   */
  Device.MODEL = 'dM';

  /**
   * Serial Number key
   * @const
   * @default
   */
  Device.SN = 'dSN';

  /**
   * Operating system key
   * @const
   * @default
   */
  Device.OS = 'dOS';

  /**
   * Nickname key
   * @const
   * @default
   */
  Device.NICKNAME = 'dN';

  /**
   * Get a String that uniquely (hopefully) determines this {@link Device}
   * @returns {string} unique name
   */
  Device.prototype.getUniqueName = function() {
    return `${this.model} - ${this.sn} - ${this.os}`;
  };

  /**
   * Get name suitable for display
   * @returns {string} descriptive name of {@link Device}
   */
  Device.prototype.getName = function() {
    let name = this.nickname;
    if (Chrome.Utils.isWhiteSpace(name)) {
      name = this.getUniqueName();
    }
    return name;
  };

  /**
   * Determine if this is our {@link Device}
   * @returns {boolean} true if this is our {@link Device}
   */
  Device.prototype.isMe = function() {
    return (this.getUniqueName() === Device.myUniqueName());
  };

  /**
   * Get unique name of our {@link Device}
   * @returns {string} unique name
   */
  Device.myUniqueName = function() {
    return `${Device.myModel()} - ${Device.mySN()} - ${Device.myOS()}`;
  };

  /**
   * Get display name of our {@link Device}
   * @returns {string} display name
   */
  Device.myName = function() {
    let name = Device.myNickname();
    if (Chrome.Utils.isWhiteSpace(name)) {
      name = Device.myUniqueName();
    }
    return name;
  };

  /**
   * Get model name of our {@link Device}
   * @returns {string} model name
   */
  Device.myModel = function() {
    return 'Chrome';
  };

  /**
   * Get serial number of our {@link Device}
   * @returns {string} serial number
   */
  Device.mySN = function() {
    return Chrome.Storage.get('deviceSN');
  };

  /**
   * Get operating system of our {@link Device}
   * @returns {string} operating system
   */
  Device.myOS = function() {
    return Chrome.Storage.get('os');
  };

  /**
   * Get os version of our {@link Device}
   * @returns {string} operating system version
   */
  Device.myVersion = function() {
    return Chrome.Utils.getChromeVersion();
  };

  /**
   * Get nickname of our {@link Device}
   * @returns {string} nickname
   */
  Device.myNickname = function() {
    return Chrome.Storage.get('deviceNickname');
  };

  window.app = window.app || {};
  window.app.Device = Device;
})(window);
