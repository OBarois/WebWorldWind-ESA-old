/*
 * Copyright 2003-2006, 2009, 2017, 2018, 2019, United States Government, as represented by the Administrator of the
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
 * @exports ArcBallCamera
 */
define([
    './geom/Angle',
    './error/ArgumentError',
    './util/Logger',
    './geom/Matrix',
    './geom/Position',
    './geom/Vec3',
    './util/WWMath',
],
    function (
        Angle,
        ArgumentError,
        Logger,
        Matrix,
        Position,
        Vec3,
        WWMath) {
        'use strict';

        /**
        * Constructs an arc ball camera.
        * @alias ArcBallCamera
        * @constructor
        * @classdesc Represents an arc ball camera.
        * @param {WorldWindow} wwd The WorldWindow instance.
        * @throws {ArgumentError} If the WorldWindow instance is missing.
        */
        var ArcBallCamera = function (wwd) {
            if (!wwd) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ArcBallCamera", "constructor",
                    "missing WorldWindow instance."));
            }

            /**
             * The position to look at
             * @type {Position}
             */
            this.position = new Position(30, -110, 0);

            /**
             * The heading of the camera, between -180 to +180 degrees. 
             * It is used to rotate left or right around the look at position.
             * @type {Number}
             * @default 0
             */
            this.heading = 0;

            /**
             * The tilt of the camera, between 0 to +90 degrees. 
             * It is used to rotate up or down around the look at position.
             * @type {Number}
             * @default 0
             */
            this.tilt = 0;

            /**
             * The range from the camera to the look at position.
             * It is used to zoom in or out.
             * @type {Number}
             * @default 10000000
             */
            this.range = 10000000;

            /**
             * This camera's roll, in degrees.
             * @type {Number}
             * @default 0
             */
            this.roll = 0;

            /**
             * The WorldWindow instance.
             * @type {WorldWindow}
             */
            this.wwd = wwd;

            //Internal variables for this class.
            this._scratchMatrix = Matrix.fromIdentity();
            this._scratchVector = new Vec3(0, 0, 0);
        };

        /**
        * Creates a view matrix for this camera.
        * @param {Matrix} matrix A matrix in which to set the view matrix.
        * @returns {Matrix} The view matrix.
        * @throws {ArgumentError} If the specified matrix is missing.
        */
        ArcBallCamera.prototype.createViewMatrix = function (matrix) {
            if (!matrix) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ArcBallCamera", "createViewMatrix",
                    "missing matrix"));
            }

            this.applyLimits();
            matrix.setToIdentity();
            matrix.multiplyByLookAtModelview(this.position, this.range, this.heading, this.tilt, this.roll, this.wwd.globe);
            return matrix;
        };

        /**
        * Clones this camera to the specified camera.
        * If a camera is not provied a new one will be created.
        * @param {ArcBallCamera | undefined} camera The camera to save the rsults in.
        * @returns {ArcBallCamera} A colne of this camera.
        */
        ArcBallCamera.prototype.clone = function (camera) {
            camera = camera || new ArcBallCamera(this.wwd);
            camera.copy(this);
            return camera;
        };

        /**
        * Copies this camera to the specified camera.
        * @param {ArcBallCamera} camera The camera to copy.
        * @returns {ArcBallCamera} This camera, set to the values of the specified camera.
        * @throws {ArgumentError} If the specified camera is missing.
        */
        ArcBallCamera.prototype.copy = function (camera) {
            if (!camera) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ArcBallCamera", "copy",
                    "missing camera"));
            }

            this.position.copy(camera.position);
            this.tilt = camera.tilt;
            this.heading = camera.heading;
            this.range = camera.range;
            this.roll = camera.roll;
            return this;
        };

        /**
        * Enforces navigation limits for this camera:
        * - a valid position: latitude -90 to 90 deg, longitude -180 to 180 deg, altitude, 0 to Number.MAX_VALUE
        * - a valid heading angle: -180 to 180 deg
        * - a valid tilt angle: 0 to 90 deg, 0 deg for 2D projections
        * - a valid roll angle: -180 to 180 deg
        * - a valid range: 1 to Number.MAX_VALUE, 1 to 40075016 for 2D projections
        */
        ArcBallCamera.prototype.applyLimits = function () {
            // Clamp latitude to between -90 and +90, and normalize longitude to between -180 and +180.
            this.position.latitude = WWMath.clamp(this.position.latitude, -90, 90);
            this.position.longitude = Angle.normalizedDegreesLongitude(this.position.longitude);

            // Clamp altitude to values greater than 0 in order to prevent looking undergound.
            this.position.altitude = WWMath.clamp(this.position.altitude, 0, Number.MAX_VALUE);

            // Clamp range to values greater than 1 in order to prevent degenerating to a first-person navigator when
            // range is zero.
            this.range = WWMath.clamp(this.range, 1, Number.MAX_VALUE);

            // Normalize heading to between -180 and +180.
            this.heading = Angle.normalizedDegrees(this.heading);

            // Clamp tilt to between 0 and +90 to prevent the viewer from going upside down.
            this.tilt = WWMath.clamp(this.tilt, 0, 90);

            // Normalize roll to between -180 and +180.
            this.roll = Angle.normalizedDegrees(this.roll);

            // Apply 2D limits when the globe is 2D.
            if (this.wwd.globe.is2D()) {
                // Clamp range to prevent more than 360 degrees of visible longitude. Assumes a 45 degree horizontal
                // field of view.
                var maxRange = 2 * Math.PI * this.wwd.globe.equatorialRadius;
                this.range = WWMath.clamp(this.range, 1, maxRange);

                // Force tilt to 0 when in 2D mode to keep the viewer looking straight down.
                this.tilt = 0;
            }
        };

        /**
       * Converts this arc ball camera to a first person camera.
       * @param {FirstPersonCamera} camera A camera in which to save the result of the transformation.
       * @returns {FirstPersonCamera} The specified camera.
       * @throws {ArgumentError} If the specified camera is missing.
       */
        ArcBallCamera.prototype.toFirstPerson = function (camera) {
            if (!camera) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "ArcBallCamera", "toFirstPerson",
                    "missing camera"));
            }

            var viewMatrix = this.createViewMatrix(this._scratchMatrix);
            var eyePoint = viewMatrix.extractEyePoint(this._scratchVector);

            var params = viewMatrix.extractViewingParameters(eyePoint, this.roll, this.wwd.globe, {});

            camera.position.copy(params.origin);
            camera.heading = params.heading;
            camera.tilt = params.tilt - 90;
            camera.roll = params.roll;

            camera.applyLimits();

            return camera;
        };

        return ArcBallCamera;
    });