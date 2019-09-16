/*
 * Copyright 2003-2006, 2009, 2017, United States Government, as represented by the Administrator of the
 * National Aeronautics and Space Administration. All rights reserved.
 *
 * The NASAWorldWind/WebWorldWind platform is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @exports Navigator
 */
define([
    '../ArcBallCamera',
    '../error/ArgumentError',
    '../FirstPersonCamera',
    '../util/Logger'
],
    function (ArcBallCamera,
        ArgumentError,
        FirstPersonCamera,
        Logger) {
        "use strict";

        /**
         * Constructs a navigator.
         * @alias Navigator
         * @constructor
         * @classdesc Represents a navigator containing the required variables to enable the user to pan, zoom and tilt
         * the globe.
         * @param {ArcBallCamera | FirstPersonCamera} camera The camera associated with the navigator
         * @throws {ArgumentError} If the camera is missing
         */
        var Navigator = function (camera) {
            if (!camera) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Navigator", "constructor",
                    "Missing camera."));
            }

            this._camera = camera;
        };

        Object.defineProperties(Navigator.prototype, {
            /**
             * The camera associated with the navigator
             * @memberof Navigator.prototype
             * @type {ArcBallCamera | FirstPersonCamera}
             */
            camera: {
                get: function () {
                    return this._camera;
                },
                set: function (camera) {
                    this._camera = camera;
                }
            },

            /**
             * The geographic location at the center of the viewport
             * @memberof Navigator.prototype
             * @type {Position}
             */
            lookAtLocation: {
                get: function () {
                    return this.camera.position;
                },
                set: function (position) {
                    this.camera.position = position;
                }
            },

            /**
             * The distance from this navigator's eye point to its look-at location
             * @memberof Navigator.prototype
             * @type {Number}
             * @default 10,000 kilometers
             */
            range: {
                get: function () {
                    return this.camera.range;
                },
                set: function (range) {
                    this.camera.range = range;
                },
            },

            /**
             * This navigator's heading, in degrees clockwise from north
             * @memberof Navigator.prototype
             * @type {Number}
             * @default 0
             */
            heading: {
                get: function () {
                    return this.camera.heading;
                },
                set: function (heading) {
                    this.camera.heading = heading;
                }
            },

            /**
             * This navigator's tilt, in degrees
             * @memberof Navigator.prototype
             * @type {Number}
             * @default 0
             */
            tilt: {
                get: function () {
                    return this.camera.tilt;
                },
                set: function (tilt) {
                    this.camera.tilt = tilt;
                }
            },

            /**
             * This navigator's roll, in degrees
             * @memberof Navigator.prototype
             * @type {Number}
             * @default 0
             */
            roll: {
                get: function () {
                    return this.camera.roll;
                },
                set: function (roll) {
                    this.camera.roll = roll;
                }
            }
        });

        /**
         * Returns the camera of this navigator as a FirstPersonCamera instance.
         * If the camera is an ArcBallCamera then it is converted to a FirstPersonCamera, otherwise a copy of the camera is returned.
         * @param {FirstPersonCamera | undefined} camera A camera where to save the results
         * @return {FirstPersonCamera} the FirstPersonCamera representation of this navigator.
         */
        Navigator.prototype.getAsFirstPersonCamera = function (camera) {
            camera = camera || new FirstPersonCamera(this.camera.wwd);

            if (this.camera instanceof FirstPersonCamera) {
                camera.copy(this.camera);
            }
            else {
                this.camera.toFirstPerson(camera);
            }

            return camera;
        };

        /**
         * Returns the camera of this navigator as an ArcBallCamera instance.
         * If the camera is a FirstPersonCamera then it is converted to an ArcBallCamera, otherwise a copy of the camera is returned.
         * @param {ArcBallCamera | undefined} camera A camera where to save the results
         * @return {ArcBallCamera} the ArcBallCamera representation of this navigator.
         */
        Navigator.prototype.getAsArcBallCamera = function (camera) {
            camera = camera || new ArcBallCamera(this.camera.wwd);

            if (this.camera instanceof FirstPersonCamera) {
                this.camera.toArcBall(camera);
            }
            else {
                camera.copy(this.camera);
            }

            return camera;
        }

        return Navigator;
    });