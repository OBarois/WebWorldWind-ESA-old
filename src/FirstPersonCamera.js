/*
 * Copyright 2003-2006, 2009, 2017, 2018, 2019 United States Government, as represented by the Administrator of the
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
 * @exports FirstPersonCamera
 */
define([
    './geom/Angle',
    './error/ArgumentError',
    './geom/Line',
    './util/Logger',
    './geom/Matrix',
    './geom/Position',
    './geom/Vec3',
    './util/WWMath',
],
    function (
        Angle,
        ArgumentError,
        Line,
        Logger,
        Matrix,
        Position,
        Vec3,
        WWMath) {
        'use strict';

        /**
        * Constructs a first person camera.
        * @alias FirstPersonCamera
        * @constructor
        * @classdesc Represents a first person camera. It is intended to be used close to the ground.
        * @param {WorldWindow} wwd The WorldWindow instance.
        * @throws {ArgumentError} If the WorldWindow instance is missing.
        */
        var FirstPersonCamera = function (wwd) {
            if (!wwd) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "FirstPersonCamera", "constructor",
                    "missing WorldWindow instance."));
            }

            /**
             * The position of the camera
             * @type {Position}
             */
            this.position = new Position(30, -110, 1000);

            /**
             * The heading of the camera, between -180 to +180 degrees. 
             * It is used for looking left or right.
             * @type {Number}
             * @default 0
             */
            this.heading = 0;

            /**
             * The tilt of the camera, between -90 to +90 degrees. 
             * It is for looking up or down.
             * @type {Number}
             * @default 0
             */
            this.tilt = 0;

            /**
             * This camera's roll, in degrees.
             * @type {Number}
             * @default 0
             */
            this.roll = 0;

            /**
             * The WorldWindow instance
             * @type {WorldWindow}
             */
            this.wwd = wwd;

            //Internal variables for this class.
            this._scratchMatrix = Matrix.fromIdentity();
            this._scratchVector = new Vec3(0, 0, 0);
            this._ray = new Line(new Vec3(0, 0, 0), new Vec3(0, 0, 0));
        };

        Object.defineProperties(FirstPersonCamera.prototype, {
            /**
             * The altitude of the camera.
             * @memberof FirstPersonCamera.prototype
             * @type {Number}
             * @default 1000 meters
             */
            range: {
                get: function () {
                    return this.position.altitude;
                },
                set: function (value) {
                    this.position.altitude = value;
                }
            }
        });

        /**
        * Creates a view matrix for this camera.
        * @param {Matrix} matrix A matrix in which to set the view matrix.
        * @returns {Matrix} The view matrix.
        * @throws {ArgumentError} If the specified matrix is missing.
        */
        FirstPersonCamera.prototype.createViewMatrix = function (matrix) {
            if (!matrix) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "FirstPersonCamera", "createViewMatrix",
                    "missing matrix"));
            }

            this.applyLimits();
            matrix.setToIdentity();
            matrix.multiplyByLookAtModelview(this.position, 0, this.heading, this.tilt + 90, this.roll, this.wwd.globe);
            return matrix;
        };

        /**
        * Clones this camera to the specified camera.
        * If a camera is not provied a new one will be created.
        * @param {FirstPersonCamera | undefined} camera The camera to save the rsults in.
        * @returns {FirstPersonCamera} A colne of this camera.
        */
        FirstPersonCamera.prototype.clone = function (camera) {
            camera = camera || new FirstPersonCamera(this.wwd);
            camera.copy(this);
            return camera;
        };

        /**
        * Copies this camera to the specified camera.
        * @param {FirstPersonCamera} camera The camera to copy.
        * @returns {FirstPersonCamera} This camera, set to the values of the specified camera.
        * @throws {ArgumentError} If the specified camera is missing.
        */
        FirstPersonCamera.prototype.copy = function (camera) {
            if (!camera) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "FirstPersonCamera", "copy",
                    "missing camera"));
            }

            this.position.copy(camera.position);
            this.heading = camera.heading;
            this.tilt = camera.tilt;
            this.roll = camera.roll;
            return this;
        };

        /**
        * Enforces navigation limits for this camera:
        * - a valid position: latitude -90 to 90 deg, longitude -180 to 180 deg, altitude, 0 to Number.MAX_VALUE
        * - a valid heading angle: -180 to +180 deg
        * - a valid tilt angle: -90 to 90 deg
        * - a valid roll angle: -180 to +180 deg
        */
        FirstPersonCamera.prototype.applyLimits = function () {
            // Clamp latitude to between -90 and +90 and normalize longitude to between -180 and +180.
            this.position.latitude = WWMath.clamp(this.position.latitude, -90, 90);
            this.position.longitude = Angle.normalizedDegreesLongitude(this.position.longitude);

            // Clamp altitude to values greater than 0 in order to prevent the camera from going undergound.
            this.position.altitude = WWMath.clamp(this.position.altitude, 0, Number.MAX_VALUE);

            // Clamp tilt to between 0 and +90 to prevent the viewer from going upside down.
            this.tilt = WWMath.clamp(this.tilt, -90, 90);

            // Normalize heading to between -180 and +180.
            this.heading = Angle.normalizedDegrees(this.heading);

            // Normalize roll to between -180 and +180.
            this.roll = Angle.normalizedDegrees(this.roll);
        };

        /**
        * Converts this camera to an ArcBallCamera.
        * The resulting lookAt position is computed from the range of the specified ArcBallCamera.
        * @param {ArcBallCamera} arcBallCamera An arcBallCamera instance in which to save the result of the transformation.
        * @returns {ArcBallCamera} The specified arcBallCamera.
        * @throws {ArgumentError} If the specified arcBallCamera is missing.
        */
        FirstPersonCamera.prototype.toArcBall = function (arcBallCamera) {
            if (!arcBallCamera) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "FirstPersonCamera", "toArcBall",
                    "missing arcBallCamera"));
            }

            var viewMatrix = this.createViewMatrix(this._scratchMatrix);
            viewMatrix.extractEyePoint(this._ray.origin);
            viewMatrix.extractForwardVector(this._ray.direction);

            var lookAtPoint = this._ray.pointAt(arcBallCamera.range, this._scratchVector);

            var params = viewMatrix.extractViewingParameters(lookAtPoint, this.roll, this.wwd.globe, {});

            arcBallCamera.position.copy(params.origin);
            arcBallCamera.heading = params.heading;
            arcBallCamera.tilt = params.tilt;
            arcBallCamera.roll = params.roll;

            arcBallCamera.applyLimits();

            return arcBallCamera;
        };

        return FirstPersonCamera;
    });