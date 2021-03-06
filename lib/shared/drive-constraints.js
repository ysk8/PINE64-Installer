/*
 * Copyright 2016 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const _ = require('lodash');
const pathIsInside = require('path-is-inside');

/**
 * @summary Check if a drive is locked
 * @function
 * @public
 *
 * @description
 * This usually points out a locked SD Card.
 *
 * @param {Object} drive - drive
 * @returns {Boolean} whether the drive is locked
 *
 * @example
 * if (constraints.isDriveLocked({
 *   device: '/dev/disk2',
 *   name: 'My Drive',
 *   size: 123456789,
 *   protected: true
 * })) {
 *   console.log('This drive is locked (e.g: write-protected)');
 * }
 */
exports.isDriveLocked = (drive) => {
  return Boolean(_.get(drive, 'protected', false));
};

/**
 * @summary Check if a drive is a system drive
 * @function
 * @public
 * @param {Object} drive - drive
 * @returns {Boolean} whether the drive is a system drive
 *
 * @example
 * if (constraints.isSystemDrive({
 *   device: '/dev/disk2',
 *   name: 'My Drive',
 *   size: 123456789,
 *   protected: true,
 *   system: true
 * })) {
 *   console.log('This drive is a system drive!');
 * }
 */
exports.isSystemDrive = (drive) => {
  return Boolean(_.get(drive, 'system', false));
};

/**
 * @summary Check if a drive is source drive
 * @function
 * @public
 *
 * @description
 * In the context of Etcher, a source drive is a drive
 * containing the image.
 *
 * @param {Object} drive - drive
 * @param {Object} image - image
 * @returns {Boolean} whether the drive is a source drive
 *
 *
 * @example
 * if (constraints.isSourceDrive({
 *   device: '/dev/disk2',
 *   name: 'My Drive',
 *   size: 123456789,
 *   protected: true,
 *   system: true,
 *   mountpoints: [
 *     {
 *       path: '/Volumes/Untitled'
 *     }
 *   ]
 * }, {
 *   path: '/Volumes/Untitled/image.img',
 *   size: 1000000000
 * })) {
 *   console.log('This drive is a source drive!');
 * }
 */
exports.isSourceDrive = (drive, image) => {
  const mountpoints = _.get(drive, 'mountpoints', []);
  const imagePath = _.get(image, 'path');

  if (!imagePath || _.isEmpty(mountpoints)) {
    return false;
  }

  return _.some(_.map(mountpoints, (mountpoint) => {
    return pathIsInside(imagePath, mountpoint.path);
  }));
};

/**
 * @summary Check if a drive is large enough for an image
 * @function
 * @public
 *
 * @param {Object} drive - drive
 * @param {Object} image - image
 * @returns {Boolean} whether the drive is large enough
 *
 * @example
 * if (constraints.isDriveLargeEnough({
 *   device: '/dev/disk2',
 *   name: 'My Drive',
 *   size: 1000000000
 * }, {
 *   path: 'rpi.img',
 *   size: 1000000000
 * })) {
 *   console.log('We can flash the image to this drive!');
 * }
 */
exports.isDriveLargeEnough = (drive, image) => {
  const recommendedImage = _.get(drive, 'recommendedImage', null);
  if (recommendedImage) {
    return _.get(drive, 'size') >= _.get(recommendedImage, 'recommendedDriveSize');
  } else if (image && typeof image.size === 'number') {
    return _.get(drive, 'size') >= _.get(image, 'size');
  }

  // return true if no local image or OS selected
  return !recommendedImage && _.isEmpty(image);
};

/**
 * @summary Check if a drive is is valid, i.e. not locked and large enough for an image
 * @function
 * @public
 *
 * @param {Object} drive - drive
 * @param {Object} image - image
 * @param {Boolean} hasOS - hasOS
 * @returns {Boolean} whether the drive is valid
 *
 * @example
 * if (constraints.isDriveValid({
 *   device: '/dev/disk2',
 *   name: 'My Drive',
 *   size: 1000000000,
 *   protected: false
 * }, {
 *   path: 'rpi.img',
 *   size: 1000000000,
 *   recommendedDriveSize: 2000000000
 * }), SelectionStateModel.hasOS()) {
 *   console.log('This drive is valid!');
 * }
 */
exports.isDriveValid = (drive, image, hasOS) => {
  if (hasOS) {
    if (drive.recommendedImage) {
      return _.every([
        !this.isDriveLocked(drive),
        this.isDriveLargeEnough(drive, {
          size: drive.recommendedImage.recommendedDriveSize
        }),
        !this.isSourceDrive(drive, {
          path: '/'
        })
      ]);
    }

    return false;
  }
  return _.every([
    !this.isDriveLocked(drive),
    this.isDriveLargeEnough(drive, image),
    !this.isSourceDrive(drive, image)
  ]);
};

/**
 * @summary Check if a drive meets the recommended drive size suggestion
 * @function
 * @public
 *
 * @description
 * If the image doesn't have a recommended size, this function returns true.
 *
 * @param {Object} drive - drive
 * @param {Object} image - image
 * @returns {Boolean} whether the drive size is recommended
 *
 * @example
 * const drive = {
 *   device: '/dev/disk2',
 *   name: 'My Drive',
 *   size: 4000000000
 * };
 *
 * const image = {
 *   path: 'rpi.img',
 *   size: 2000000000
 *   recommendedDriveSize: 4000000000
 * });
 *
 * if (constraints.isDriveSizeRecommended(drive, image)) {
 *   console.log('We meet the recommended drive size!');
 * }
 */
exports.isDriveSizeRecommended = (drive, image) => {
  return _.get(drive, 'size', 0) >= _.get(image, 'recommendedDriveSize', 0);
};
