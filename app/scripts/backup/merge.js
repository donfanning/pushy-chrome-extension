/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
window.app = window.app || {};

/**
 * Handle merging of database data
 * @namespace
 */
app.MergeDBData = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Get the largest PK in the {@link Label} objects
   * @param {Label[]} labels
   * @returns {int}
   * @private
   * @memberOf app.MergeDBData
   */
  function _getLargestLabelId(labels) {
    let ret = 0;
    labels.forEach((label) => {
      ret = (label._id > ret) ? label._id : ret;
    });
    return ret;
  }

  /**
   * Get the position of a {@link Label}
   * @param {Label[]} labels
   * @param {Label} theLabel
   * @returns {int} -1 if not found
   * @private
   * @memberOf app.MergeDBData
   */
  function _getLabelPos(labels, theLabel) {
    return labels.findIndex((label) => {
      return label.name === theLabel.name;
    });
  }

  /**
   * Get the position of a {@link ClipItem}
   * @param {ClipItem[]} clipItems
   * @param {ClipItem} theClipItem
   * @returns {int} -1 if not found
   * @private
   * @memberOf app.MergeDBData
   */
  function _getClipItemPos(clipItems, theClipItem) {
    return clipItems.findIndex((clipItem) => {
      return clipItem.text === theClipItem.text;
    });
  }

  /**
   * Update the PK in the labels and labelsId arrays
   * for all the {@link ClipItem} objects
   * @param {ClipItem[]} clipItems
   * @param {Label} theLabel
   * @private
   * @memberOf app.MergeDBData
   */
  function _updateLabelId(clipItems, theLabel) {
    // update labelId in all clipItems
    clipItems.forEach((clipItem) => {
      const labels = clipItem.labels;
      const labelsId = clipItem.labelsId;
      for (let i = 0; i < labels.length; i++) {
        if (labels[i].name === theLabel.name) {
          const idx = labelsId.indexOf(labels[i]._id);
          if (idx !== -1) {
            labelsId[idx] = theLabel._id;
          }
          labels[i]._id = theLabel._id;
          break;
        }
      }
    });
  }

  return {
    /**
     * Merge the data in two {@link app.Backup.Data} objects
     * @param {app.Backup.Data} data1
     * @param {app.Backup.Data} data2
     * @returns {Promise<app.Backup.Data>} merged data
     * @memberOf app.MergeDBData
     */
    merge: function(data1, data2) {

      const data = data1;
      const dataLabels = data.labels;
      const dataClipItems = data.clipItems;

      const data2Labels = data2.labels;
      const data2ClipItems = data2.clipItems;

      let newLabelId = _getLargestLabelId(dataLabels);
      newLabelId++;

      data2Labels.forEach((label) => {
        const pos = _getLabelPos(dataLabels, label);
        if (pos === -1) {
          // add new label with unique id to theirs
          const newLabel = new app.Label(label.name);
          newLabel._id = newLabelId;
          dataLabels.push(newLabel);
          newLabelId++;
          // update labelId in our clips
          _updateLabelId(data2ClipItems, newLabel);
        } else {
          // label exists in both
          if (label._id !== dataLabels[pos]._id) {
            // update label id our clips
            _updateLabelId(data2ClipItems, dataLabels[pos]);
          }
        }
      });

      data2ClipItems.forEach((clipItem) => {
        const pos = _getClipItemPos(dataClipItems, clipItem);
        if (pos === -1) {
          // add new clip
          dataClipItems.push(clipItem);
        } else {
          // shared clip - sync
          const dataClipItem = dataClipItems[pos];
          if (clipItem.fav) {
            // favorite true has priority
            dataClipItem.fav = true;
          }
          if (clipItem.date > dataClipItem.date) {
            // newest clip has priority
            dataClipItem.date = clipItem.date;
            dataClipItem.device = clipItem.device;
            dataClipItem.remote = true;
          }
          // sync labels and labelsId
          const dataLabels = dataClipItem.labels;
          const dataLabelsId = dataClipItem.labelsId;
          clipItem.labels.forEach((label) => {
            const pos = _getLabelPos(dataLabels, label);
            if (pos === -1) {
              // add new label
              dataLabels.push(label);
              dataLabelsId.push(label._id);
            }
          });
        }
      });
      return Promise.resolve(data);
    },
  };
})();
