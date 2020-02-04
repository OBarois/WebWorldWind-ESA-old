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
 * @exports BasicWorldWindowController
 */
define([
        './geom/Angle',
        './ArcBallCamera',
        './error/ArgumentError',
        './gesture/ClickRecognizer',
        './gesture/DragRecognizer',
        './gesture/FlingRecognizer',
        './gesture/GestureRecognizer',
        './geom/Line',
        './geom/Location',
        './util/Logger',
        './geom/Matrix',
        './util/measure/MeasurerUtils',
        './gesture/PanRecognizer',
        './gesture/PinchRecognizer',
        './geom/Position',
        './gesture/RotationRecognizer',
        './gesture/TapRecognizer',
        './gesture/TiltRecognizer',
        './geom/Vec2',
        './geom/Vec3',
        './WorldWindowController',
        './util/WWMath'
    ],
    function (Angle,
              ArcBallCamera,
              ArgumentError,
              ClickRecognizer,
              DragRecognizer,
              FlingRecognizer,
              GestureRecognizer,
              Line,
              Location,
              Logger,
              Matrix,
              MeasurerUtils,
              PanRecognizer,
              PinchRecognizer,
              Position,
              RotationRecognizer,
              TapRecognizer,
              TiltRecognizer,
              Vec2,
              Vec3,
              WorldWindowController,
              WWMath) {
        "use strict";

        /**
         * Constructs a window controller with basic capabilities.
         * @alias BasicWorldWindowController
         * @constructor
         * @augments WorldWindowController
         * @classDesc This class provides the default window controller for WorldWind for controlling the globe via user interaction.
         * @param {WorldWindow} worldWindow The WorldWindow associated with this layer.
         */
        var BasicWorldWindowController = function (worldWindow) {
            WorldWindowController.call(this, worldWindow); // base class checks for a valid worldWindow

            /**
             * Enables/disables the zoom to mouse effect.
             * When used on a touch device the location of the mouse is the center between the touch points.
             *
             * When zooming in, the location of the mouse will move towards the center of the screen.
             * When zooming out, the location of the mouse will away from the center of the screen.
             *
             * @type {Boolean}
             * @default true
             */
            this.zoomToMouseEnabled = true;

            /**
             * Keep the globe in north up position
             *
             * @type {Boolean}
             * @default true
             */
            this.keepNorthUp = true;

            // Intentionally not documented.
            this.primaryDragRecognizer = new DragRecognizer(this.wwd, null);
            this.primaryDragRecognizer.addListener(this);

            // Intentionally not documented.
            this.secondaryDragRecognizer = new DragRecognizer(this.wwd, null);
            this.secondaryDragRecognizer.addListener(this);
            this.secondaryDragRecognizer.button = 2; // secondary mouse button

            // Intentionally not documented.
            this.panRecognizer = new PanRecognizer(this.wwd, null);
            this.panRecognizer.addListener(this);

            // Intentionally not documented.
            this.pinchRecognizer = new PinchRecognizer(this.wwd, null);
            this.pinchRecognizer.addListener(this);

            // Intentionally not documented.
            this.rotationRecognizer = new RotationRecognizer(this.wwd, null);
            this.rotationRecognizer.addListener(this);

            // Intentionally not documented.
            this.tiltRecognizer = new TiltRecognizer(this.wwd, null);
            this.tiltRecognizer.addListener(this);

            // Establish the dependencies between gesture recognizers. The pan, pinch and rotate gesture may recognize
            // simultaneously with each other.
            this.panRecognizer.recognizeSimultaneouslyWith(this.pinchRecognizer);
            this.panRecognizer.recognizeSimultaneouslyWith(this.rotationRecognizer);
            this.pinchRecognizer.recognizeSimultaneouslyWith(this.rotationRecognizer);

            // Since the tilt gesture is a subset of the pan gesture, pan will typically recognize before tilt,
            // effectively suppressing tilt. Establish a dependency between the other touch gestures and tilt to provide
            // tilt an opportunity to recognize.
            this.panRecognizer.requireRecognizerToFail(this.tiltRecognizer);
            this.pinchRecognizer.requireRecognizerToFail(this.tiltRecognizer);
            this.rotationRecognizer.requireRecognizerToFail(this.tiltRecognizer);

            // Intentionally not documented.
            this.tapRecognizer = new TapRecognizer(this.wwd, null);
            this.tapRecognizer.addListener(this);

            // Intentionally not documented.
            this.clickRecognizer = new ClickRecognizer(this.wwd, null);
            this.clickRecognizer.addListener(this);

            // Intentionally not documented.
            this.doubleClickRecognizer = new ClickRecognizer(this.wwd, null);
            this.doubleClickRecognizer.addListener(this);
            this.doubleClickRecognizer.numberOfClicks = 2;
            this.doubleClickRecognizer.maxClickInterval = 200;
            this.doubleClickRecognizer.recogniseOnLastMouseDown = true;
            this.doubleClickRecognizer.recognizeSimultaneouslyWith(this.clickRecognizer);
            this.doubleClickRecognizer.recognizeSimultaneouslyWith(this.primaryDragRecognizer);

            // Intentionally not documented.
            this.doubleTapRecognizer = new ClickRecognizer(this.wwd, null);
            this.doubleTapRecognizer.addListener(this);
            this.doubleTapRecognizer.numberOfTaps = 2;
            this.doubleTapRecognizer.maxTapInterval = 200;
            this.doubleTapRecognizer.recognizeOnLastTouchStart = true;
            this.doubleTapRecognizer.recognizeSimultaneouslyWith(this.tapRecognizer);
            this.doubleTapRecognizer.recognizeSimultaneouslyWith(this.primaryDragRecognizer);            

            // Intentionally not documented.
            this.flingRecognizer = new FlingRecognizer(this.wwd, null);
            this.flingRecognizer.addListener(this);
            this.flingRecognizer.recognizeSimultaneouslyWith(this.primaryDragRecognizer);
            this.flingRecognizer.recognizeSimultaneouslyWith(this.panRecognizer);
            this.flingRecognizer.recognizeSimultaneouslyWith(this.pinchRecognizer);
            this.flingRecognizer.recognizeSimultaneouslyWith(this.rotationRecognizer);
            this.flingRecognizer.recognizeSimultaneouslyWith(this.doubleClickRecognizer);
            this.flingRecognizer.recognizeSimultaneouslyWith(this.doubleTapRecognizer);

            // Intentionally not documented.
            this.beginPoint = new Vec2(0, 0);
            this.lastPoint = new Vec2(0, 0);
            this.beginHeading = 0;
            this.beginTilt = 0;
            this.beginRange = 0;
            this.lastRotation = 0;
            this.pointerLocation = null;
            this.dragDelta = new Vec2(0, 0);
            this.dragLastLocation = new Location(0, 0);
            this.flingAnimationId = -1;

            this.beginIntersectionPoint = new Vec3(0, 0, 0);
            this.lastIntersectionPoint = new Vec3(0, 0, 0);
            this.beginIntersectionPosition = new Position(0, 0, 0);
            this.lastIntersectionPosition = new Position(0, 0, 0);
            this.rotationVector = new Vec3(0, 0, 0);
            this.scratchRay = new Line(new Vec3(0, 0, 0), new Vec3(0, 0, 0));
            this.scratchMatrix = Matrix.fromIdentity();

            this.doubleClick = false;
            this.tripleCLick = false;
            this.longClick = false;
            this.readyToDetectLongClickBeforeMove = true;
            this.lastClickTime = 0;
            this.northUpMode = true;
            this.detectNorthUp = false;
            this.lastDeltaScale = 0;
        };

        BasicWorldWindowController.prototype = Object.create(WorldWindowController.prototype);

        // Intentionally not documented.
        BasicWorldWindowController.prototype.onGestureEvent = function (e) {
            var handled = WorldWindowController.prototype.onGestureEvent.call(this, e);

            // console.log(e.type)

            if (e.type === 'mousemove' || (e.pointerType === 'mouse' && e.type === 'pointermove')) {
                this.pointerLocation = null;
            }

            if (e.type === 'pointermove') {
                // detect long click
                if (this.readyToDetectLongClickBeforeMove) {
                    this.longClick = (e.timeStamp - this.lastClickTime > 1000)
                    console.log("long long click: "+this.longClick)
                    this.readyToDetectLongClickBeforeMove = false                    
                }

            }

            if (e.type === 'pointerup') {
                // this.doubleClick = false
            }

            if (e.type === 'pointerdown') {
                // detect double click/tap
                if (!this.doubleClick) {
                    this.doubleClick = (e.timeStamp - this.lastClickTime < 300)
                    console.log("double click: "+this.doubleClick)
                }
                this.readyToDetectLongClickBeforeMove = true
                this.lastClickTime = e.timeStamp
                this.cancelFlingAnimation();
                this.longClick = false;
            }

            if (!handled) {
                if (e.type === "wheel") {
                    handled = true;
                    this.handleWheelEvent(e);
                }
                else {
                    for (var i = 0, len = GestureRecognizer.allRecognizers.length; i < len; i++) {
                        var recognizer = GestureRecognizer.allRecognizers[i];
                        if (recognizer.target === this.wwd) {
                            handled |= recognizer.onGestureEvent(e); // use or-assignment to indicate if any recognizer handled the event
                        }
                    }
                }
            }

            return handled;
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.gestureStateChanged = function (recognizer) {
            // if (recognizer.state === WorldWind.BEGAN || recognizer.state === WorldWind.RECOGNIZED) {
            //     this.cancelFlingAnimation();
            // }

            var isArcBall = this.wwd.navigator.camera instanceof ArcBallCamera;

            // // If a double click started the gesture, handle as a zoom
            // if (recognizer === this.doubleClickRecognizer || recognizer === this.doubleTapRecognizer) {
            //     console.log("double")
            //     this.doubleClick = true
            // }
            
            if (recognizer === this.primaryDragRecognizer || recognizer === this.panRecognizer) {
                 if (isArcBall) {
                    this.handlePanOrDrag(recognizer);
                    }
                    else {
                        this.handleSecondaryDrag(recognizer);
                    }
            }
            else if (recognizer === this.secondaryDragRecognizer) {
                if (isArcBall) {
                    this.handleSecondaryDrag(recognizer);
                }
            }
            else if (recognizer === this.pinchRecognizer) {
                this.handlePinch(recognizer);
            }
            else if (recognizer === this.rotationRecognizer) {
                this.handleRotation(recognizer);
            }
            else if (recognizer === this.tiltRecognizer) {
                this.handleTilt(recognizer);
            }
            else if (recognizer === this.clickRecognizer || recognizer === this.tapRecognizer) {
                this.handleClickOrTap(recognizer);
            }
            else if (recognizer === this.flingRecognizer) {
                this.handleFling(recognizer);
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleClickOrTap = function (recognizer) {
            // this.cancelFlingAnimation();
        }
        //     if (recognizer.state === WorldWind.RECOGNIZED) {
        //         var pickPoint = this.wwd.canvasCoordinates(recognizer.clientX, recognizer.clientY);
        //
        //         // Identify if the top picked object contains a URL for hyperlinking
        //         var pickList = this.wwd.pick(pickPoint);
        //         var topObject = pickList.topPickedObject();
        //         // If the url object was appended, open the hyperlink
        //         if (topObject &&
        //             topObject.userObject &&
        //             topObject.userObject.userProperties &&
        //             topObject.userObject.userProperties.url) {
        //             window.open(topObject.userObject.userProperties.url, "_blank");
        //         }
        //     }
        // };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handlePanOrDrag = function (recognizer) {

            if (this.wwd.globe.is2D()) {
                this.handlePanOrDrag2D(recognizer);
            } else {
                if (this.doubleClick) {
                    this.handleDoubleClickDragOrPan(recognizer)
                } else {
                    this.handlePanOrDrag3D(recognizer);
                }                
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handlePanOrDrag3D = function (recognizer) {
            var wwd = this.wwd;
            var state = recognizer.state;
            var x = recognizer.clientX;
            var y = recognizer.clientY;

            if (state === WorldWind.BEGAN) {
                // this.cancelFlingAnimation();
                var ray = wwd.rayThroughScreenPoint(wwd.canvasCoordinates(x, y));
                if (!wwd.globe.intersectsLine(ray, this.beginIntersectionPoint)) {
                    return;
                }
                wwd.globe.computePositionFromPoint(this.beginIntersectionPoint[0], this.beginIntersectionPoint[1], this.beginIntersectionPoint[2], this.beginIntersectionPosition);
                this.beginPoint.set(x, y);
                this.lastPoint.set(x, y);
            }
            else if (state === WorldWind.CHANGED) {
                var didMove = this.move3D(x, y);
                if (didMove) {
                    this.beginPoint.copy(this.lastPoint);
                    this.lastPoint.set(x, y);
                    this.applyLimits();
                    this.dragDelta.set(
                        this.dragLastLocation.latitude - wwd.navigator.lookAtLocation.latitude,
                        Angle.normalizedDegreesLongitude(
                            this.dragLastLocation.longitude - wwd.navigator.lookAtLocation.longitude
                        )
                    );
                    this.dragLastLocation.copy(wwd.navigator.lookAtLocation);
                    wwd.redraw();
                }
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.move3D = function(x, y) {
            var wwd = this.wwd;
            
            var ray = wwd.rayThroughScreenPoint(wwd.canvasCoordinates(x, y));
            if (!wwd.globe.intersectsLine(ray, this.lastIntersectionPoint)) {
                return false;
            }
            wwd.globe.computePositionFromPoint(this.lastIntersectionPoint[0], this.lastIntersectionPoint[1], this.lastIntersectionPoint[2], this.lastIntersectionPosition);

            // if (this.isSphereRotation(this.lastIntersectionPosition)) {
            if(!this.northUpMode) {
                var rotationAngle = this.computeRotationVectorAndAngle(this.beginIntersectionPoint, this.lastIntersectionPoint, this.rotationVector);
                var isFling = false;
                return this.rotateShpere(this.rotationVector, rotationAngle, isFling);
            }
            else {
                var deltaLat = this.lastIntersectionPosition.latitude - this.beginIntersectionPosition.latitude;
                var deltaLon = this.lastIntersectionPosition.longitude - this.beginIntersectionPosition.longitude;
                var lookAtLocation = wwd.navigator.lookAtLocation;
                lookAtLocation.latitude -= deltaLat;
                lookAtLocation.longitude -= deltaLon;
                return true;
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.isSphereRotation = function (lastIntersectionPosition) {
            var looAtLatitude = this.wwd.navigator.lookAtLocation.latitude; 
            var heading = this.wwd.navigator.heading;

            // return (false);
            return ((Math.abs(heading) !== 0 || Math.abs(looAtLatitude) > 75 || Math.abs(lastIntersectionPosition.latitude) > 75) );
            // return (( Math.abs(looAtLatitude) > 75 || Math.abs(lastIntersectionPosition.latitude) > 75) && !this.northUpMode);
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.computeRotationVectorAndAngle = function (vec1, vec2, rotationVector) {
            var angleRad = MeasurerUtils.angleBetweenVectors(vec1, vec2);
            var angle = angleRad * Angle.RADIANS_TO_DEGREES;
            rotationVector.copy(vec1);
            rotationVector.cross(vec2);
            rotationVector.normalize();
            return angle;
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.rotateShpere = function (rotationVector, angle, isFling) {
            if (!isFinite(angle) || !isFinite(rotationVector[0]) || !isFinite(rotationVector[1]) || !isFinite(rotationVector[2])) {
                return false;
            }

            var wwd = this.wwd;
            var navigator = wwd.navigator;
            var viewMatrix = this.scratchMatrix;
            var altitude = navigator.lookAtLocation.altitude;
            var tilt = navigator.tilt;
            
            navigator.tilt = 0;
            wwd.computeViewingTransform(null, viewMatrix);
            viewMatrix.multiplyByRotation(rotationVector[0], rotationVector[1], rotationVector[2], angle);

            viewMatrix.extractEyePoint(this.scratchRay.origin);
            viewMatrix.extractForwardVector(this.scratchRay.direction);
            if (!wwd.globe.intersectsLine(this.scratchRay, this.lastIntersectionPoint)) {
                navigator.tilt = tilt;
                return false;
            }

            var params = viewMatrix.extractViewingParameters(this.lastIntersectionPoint, navigator.roll, wwd.globe, {});
            if (!isFling && Math.abs(navigator.heading) < 5 && Math.abs(navigator.lookAtLocation.latitude < 70) && Math.abs(this.lastIntersectionPosition.latitude) < 70) {
                navigator.heading = Math.round(params.heading);
            }
            else {
                navigator.heading = params.heading;
            }
            navigator.lookAtLocation.copy(params.origin);
            navigator.lookAtLocation.altitude = altitude;
            navigator.tilt = tilt;
            
             return true;
        }

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handlePanOrDrag2D = function (recognizer) {
            var state = recognizer.state,
                x = recognizer.clientX,
                y = recognizer.clientY,
                tx = recognizer.translationX,
                ty = recognizer.translationY;

            var navigator = this.wwd.navigator;
            if (state === WorldWind.BEGAN) {
                
                this.beginPoint.set(x, y);
                this.lastPoint.set(x, y);
            } else if (state === WorldWind.CHANGED) {
                this.move2D(tx, ty);
            }
        };

        BasicWorldWindowController.prototype.move2D = function (tx, ty) {
            var navigator = this.wwd.navigator;
            var x1 = this.lastPoint[0],
                y1 = this.lastPoint[1],
                x2 = this.beginPoint[0] + tx,
                y2 = this.beginPoint[1] + ty;

            this.lastPoint.set(x2, y2);

            var globe = this.wwd.globe,
                ray = this.wwd.rayThroughScreenPoint(this.wwd.canvasCoordinates(x1, y1)),
                point1 = new Vec3(0, 0, 0),
                point2 = new Vec3(0, 0, 0),
                origin = new Vec3(0, 0, 0);

            if (!globe.intersectsLine(ray, point1)) {
                return;
            }

            ray = this.wwd.rayThroughScreenPoint(this.wwd.canvasCoordinates(x2, y2));
            if (!globe.intersectsLine(ray, point2)) {
                return;
            }

            // Transform the original navigator state's modelview matrix to account for the gesture's change.
            var modelview = Matrix.fromIdentity();
            this.wwd.computeViewingTransform(null, modelview);
            modelview.multiplyByTranslation(point2[0] - point1[0], point2[1] - point1[1], point2[2] - point1[2]);

            // Compute the globe point at the screen center from the perspective of the transformed navigator state.
            modelview.extractEyePoint(ray.origin);
            modelview.extractForwardVector(ray.direction);
            if (!globe.intersectsLine(ray, origin)) {
                return;
            }

            // Convert the transformed modelview matrix to a set of navigator properties, then apply those
            // properties to this navigator.
            var params = modelview.extractViewingParameters(origin, navigator.roll, globe, {});
            navigator.lookAtLocation.copy(params.origin);
            navigator.range = params.range;
            navigator.heading = params.heading;
            navigator.tilt = params.tilt;
            navigator.roll = params.roll;
            this.applyLimits();
            this.wwd.redraw();

            this.dragDelta.set(x1 - x2, y1 - y2);
            this.dragLastLocation.copy(navigator.lookAtLocation);
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleFling = function (recognizer) {
            if (this.wwd.globe.is2D()) {
                this.handleFling2D(recognizer);
            } else {
                if (this.doubleClick) {
                    this.handleDoubleClickFling(recognizer);
                } else {
                    this.handleFling3D(recognizer);
                }
                
            }
        };

        BasicWorldWindowController.prototype.handleFling2D = function (recognizer) {
            if (recognizer.state === WorldWind.RECOGNIZED) {
                var wwd = this.wwd;
                var navigator = wwd.navigator;

                var animationDuration = 1500; // ms

                this.beginPoint.copy(this.lastPoint);

                // Last location set by this animation
                var lastLocation = new Location();
                lastLocation.copy(this.dragLastLocation);

                // Start time of this animation
                var startTime = new Date();

                var beginTx = this.dragDelta[0];
                var beginTy = this.dragDelta[1];
                var tx = beginTx;
                var ty = beginTy;

                // Animation Loop
                var controller = this;
                var animate = function () {
                    controller.flingAnimationId = -1;

                    if (!lastLocation.equals(navigator.lookAtLocation)) {
                        // The navigator was changed externally. Aborting the animation.
                        return;
                    }

                    // Compute the delta to apply using a sinusoidal out easing
                    var elapsed = (new Date() - startTime) / animationDuration;
                    elapsed = elapsed > 1 ? 1 : elapsed;
                    var value = Math.sin(elapsed * Math.PI / 2);

                    tx -= beginTx - beginTx * value;
                    ty -= beginTy - beginTy * value;

                    controller.move2D(tx, ty);

                    // Save the new current lookAt location
                    lastLocation.copy(navigator.lookAtLocation);

                    // If we haven't reached the animation duration, request a new frame
                    if (elapsed < 1) {
                        controller.flingAnimationId = requestAnimationFrame(animate);
                    }
                };

                this.flingAnimationId = requestAnimationFrame(animate);
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleFling3D = function (recognizer) {

            if (recognizer.state === WorldWind.RECOGNIZED) {
                var navigator = this.wwd.navigator;

                var animationDuration = 1500; // ms

                // Initial delta at the beginning of this animation
                var initialDelta = new Vec2();
                initialDelta.copy(this.dragDelta);

                // Last location set by this animation
                var lastLocation = new Location();
                lastLocation.copy(this.dragLastLocation);

                var wwd = this.wwd;
                var rotationAngle = 0;

                var ray = wwd.rayThroughScreenPoint(wwd.canvasCoordinates(this.lastPoint[0], this.lastPoint[1]));
                if (!wwd.globe.intersectsLine(ray, this.lastIntersectionPoint)) {
                    return;
                }
                wwd.globe.computePositionFromPoint(this.lastIntersectionPoint[0], this.lastIntersectionPoint[1], this.lastIntersectionPoint[2], this.lastIntersectionPosition);

                var shouldUseSphereRotation = this.isSphereRotation(this.lastIntersectionPosition);
                if (shouldUseSphereRotation) {
                    var ray = wwd.rayThroughScreenPoint(wwd.canvasCoordinates(this.beginPoint[0], this.beginPoint[1]));
                    if (!wwd.globe.intersectsLine(ray, this.beginIntersectionPoint)) {
                        return;
                    }

                    rotationAngle = this.computeRotationVectorAndAngle(this.beginIntersectionPoint, this.lastIntersectionPoint, this.rotationVector);
                    if (!isFinite(rotationAngle) || !isFinite(this.rotationVector[0]) || !isFinite(this.rotationVector[1]) || !isFinite(this.rotationVector[2])) {
                        return;
                    }
                }

                // Start time of this animation
                var startTime = new Date();

                var northUpMode = this.northUpMode

                // Animation Loop
                var controller = this;
                var animate = function () {
                    controller.flingAnimationId = -1;

                    // if (!lastLocation.equals(navigator.lookAtLocation)) {
                    //     // The navigator was changed externally. Aborting the animation.
                    //     return;
                    // }

                    // Compute the delta to apply using a sinusoidal out easing
                    var elapsed = (new Date() - startTime) / (controller.longClick?6000000:animationDuration);
                    elapsed = elapsed > 1 ? 1 : elapsed;
                    var value = Math.sin(elapsed * Math.PI / 2);

                    // if (shouldUseSphereRotation) {
                    if ( !northUpMode ) {

                        var angle = rotationAngle * (1 - value);
                        var isFling = true;
                        controller.rotateShpere(controller.rotationVector, angle, isFling);
                    }
                    else {
                        var deltaLatitude = initialDelta[0] - initialDelta[0] * value;
                        var deltaLongitude = initialDelta[1] - initialDelta[1] * value;
                        navigator.lookAtLocation.latitude -= deltaLatitude;
                        navigator.lookAtLocation.longitude -= deltaLongitude;
                    }

                    controller.applyLimits();
                    controller.wwd.redraw();

                    // Save the new current lookAt location
                    lastLocation.copy(navigator.lookAtLocation);

                    // If we haven't reached the animation duration, request a new frame
                    if (elapsed < 1) {
                        controller.flingAnimationId = requestAnimationFrame(animate);
                    }
                };

                this.flingAnimationId = requestAnimationFrame(animate);
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.cancelFlingAnimation = function () {
            if (this.flingAnimationId !== -1) {
                cancelAnimationFrame(this.flingAnimationId);
                this.flingAnimationId = -1;

            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleSecondaryDrag = function (recognizer) {
            var state = recognizer.state,
                tx = recognizer.translationX,
                ty = recognizer.translationY;

            var navigator = this.wwd.navigator;
            var isArcBall = navigator.camera instanceof ArcBallCamera;

            if (state === WorldWind.BEGAN) {
                this.beginHeading = navigator.heading;
                this.beginTilt = navigator.tilt;
                this.detectNorthUp=false;
            } else if (state === WorldWind.CHANGED) {
                // Compute the current translation from screen coordinates to degrees. Use the canvas dimensions as a
                // metric for converting the gesture translation to a fraction of an angle.
                var headingDegrees = 180 * tx / this.wwd.canvas.clientWidth,
                    tiltDegrees = 90 * ty / this.wwd.canvas.clientHeight;

                // Apply the change in tilt to this navigator's corresponding properties.
                navigator.tilt = this.beginTilt + tiltDegrees;

                // Apply the change in heading to this navigator's corresponding properties.
                // If the keepNorthUp flag is true, will lock the heading to North when the rotation comes close
                if (isArcBall) {
                    if(Math.abs(navigator.heading) < 10 && this.detectNorthUp) {
                        this.northUpMode = this.keepNorthUp
                        navigator.heading = 0
                        // this.detectNorthUp=true;
                    } else {
                        this.northUpMode = false;
                        navigator.heading = this.beginHeading + headingDegrees;
                        if(Math.abs(navigator.heading) > 10) {
                            this.detectNorthUp=true;
                        }
                        
                    }
    
                } else {
                    navigator.heading = this.beginHeading + headingDegrees;
                }
                this.applyLimits();
                this.wwd.redraw();
            }


        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handlePinch = function (recognizer) {
            var navigator = this.wwd.navigator;
            var state = recognizer.state,
                scale = recognizer.scale;

            if (state === WorldWind.BEGAN) {
                this.beginRange = navigator.range;
                this.pointerLocation = null;
            } else if (state === WorldWind.CHANGED) {
                if (scale !== 0) {
                    var newRange = this.beginRange / scale;
                    var amount =  newRange / navigator.range;
                    this.moveZoom(recognizer.clientX, recognizer.clientY, amount);

                    // Apply the change in pinch scale to this navigator's range, relative to the range when the gesture
                    // began.
                    navigator.range = newRange;
                    this.applyLimits();
                    this.wwd.redraw();
                }
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleRotation = function (recognizer) {
            var navigator = this.wwd.navigator;
            var state = recognizer.state,
                rotation = recognizer.rotation;
                

            if (state === WorldWind.BEGAN) {
                this.lastRotation = 0;
                this.detectNorthUp = false;
            } else if (state === WorldWind.CHANGED) {
                // Apply the change in gesture rotation to this navigator's current heading. We apply relative to the
                // current heading rather than the heading when the gesture began in order to work simultaneously with
                // pan operations that also modify the current heading.
                

                if(Math.abs(navigator.heading) < 10 && this.detectNorthUp) {
                    this.northUpMode = this.keepNorthUp
                    navigator.heading = 0
                } else {
                    this.northUpMode = false;
                    navigator.heading -= rotation - this.lastRotation;
                    if(Math.abs(navigator.heading) > 10) {
                        this.detectNorthUp=true;
                    }
                }


                this.lastRotation = rotation;
                this.applyLimits();
                this.wwd.redraw();       
            }
         

        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleTilt = function (recognizer) {
            var navigator = this.wwd.navigator;
            var state = recognizer.state,
                ty = recognizer.translationY;

            if (state === WorldWind.BEGAN) {
                this.beginTilt = navigator.tilt;
            } else if (state === WorldWind.CHANGED) {
                // Compute the gesture translation from screen coordinates to degrees. Use the canvas dimensions as a
                // metric for converting the translation to a fraction of an angle.
                var tiltDegrees = -90 * ty / this.wwd.canvas.clientHeight;
                // Apply the change in heading and tilt to this navigator's corresponding properties.
                navigator.tilt = this.beginTilt + tiltDegrees;
                this.applyLimits();
                this.wwd.redraw();

                this.northUpMode = false
                this.detectNorthUp = true
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleDoubleClickDragOrPan = function (recognizer) {

            var state = recognizer.state;
            var x = recognizer.clientX;
            var y = recognizer.clientY;
            // var ty = recognizer.translationY;

            if (state === WorldWind.BEGAN) {       
                this.beginPoint.set(x, y);
                this.lastPoint.set(x, y);
            } 
            else if (state === WorldWind.CHANGED) {

                var deltaScale = y - this.lastPoint[1]
                var navigator = this.wwd.navigator;
                var scale = 1 - (deltaScale / 200);
    
                this.lastPoint.set(x, y);
                // this.moveZoom(this.beginPoint[0], this.beginPoint[1], scale);
    
                // Apply the scale to this navigator's properties.
                navigator.range *= scale;
                this.lastdeltaScale = deltaScale
                this.applyLimits();
                this.wwd.redraw();
    
            }
        }

        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleDoubleClickFling = function (recognizer) {
            if (recognizer.state === WorldWind.RECOGNIZED) {
                var navigator = this.wwd.navigator;

                var animationDuration = 500; // ms
                var lastLocation = new Location();
                lastLocation.copy(navigator.lookAtLocation);

                // Start time of this animation
                var startTime = new Date();

                // Animation Loop
                var controller = this;
                var scale = 1;
                var animate = function () {
                    controller.flingAnimationId = -1;

                    if (!lastLocation.equals(navigator.lookAtLocation)) {
                        // The navigator was changed externally. Aborting the animation.
                        return;
                    }

                    // Compute the delta to apply using a sinusoidal out easing
                    var elapsed = (new Date() - startTime) / animationDuration;
                    elapsed = elapsed > 1 ? 1 : elapsed;
                    var value = Math.sin(elapsed * Math.PI / 2);

                    scale = 1 - ( (controller.lastdeltaScale - value) / 200);
                    navigator.range *= scale

                    controller.applyLimits();
                    controller.wwd.redraw();

                    // If we haven't reached the animation duration, request a new frame
                    if (elapsed < 1 ) {
                        controller.flingAnimationId = requestAnimationFrame(animate);
                    }
                };

                this.flingAnimationId = requestAnimationFrame(animate);
                this.doubleClick = false
            
                
            }

        }



        // Intentionally not documented.
        BasicWorldWindowController.prototype.handleWheelEvent = function (event) {
            // this.cancelFlingAnimation();

            var navigator = this.wwd.navigator;
            // Normalize the wheel delta based on the wheel delta mode. This produces a roughly consistent delta across
            // browsers and input devices.
            var normalizedDelta;
            if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
                normalizedDelta = event.deltaY;
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                normalizedDelta = event.deltaY * 40;
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                normalizedDelta = event.deltaY * 400;
            }

            // Compute a zoom scale factor by adding a fraction of the normalized delta to 1. When multiplied by the
            // navigator's range, this has the effect of zooming out or zooming in depending on whether the delta is
            // positive or negative, respectfully.
            var scale = 1 + (normalizedDelta / 1000);

            this.moveZoom(event.clientX, event.clientY, scale);

            // Apply the scale to this navigator's properties.
            navigator.range *= scale;
            this.applyLimits();
            this.wwd.redraw();
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.locationAtPickPoint = function (x, y) {
            var coordinates = this.wwd.canvasCoordinates(x, y);
            var pickList = this.wwd.pickTerrain(coordinates);

            for (var i = 0; i < pickList.objects.length; i++) {
                var pickedObject = pickList.objects[i];
                if (pickedObject.isTerrain) {
                    var pickedPosition = pickedObject.position;
                    if (pickedPosition) {
                        return new Location(pickedPosition.latitude, pickedPosition.longitude);
                    }
                }
            }
        };

        // Intentionally not documented.
        BasicWorldWindowController.prototype.moveZoom = function (x, y, amount) {
            if (!this.zoomToMouseEnabled) {
                return;
            }

            if (amount === 1) {
                return;
            }

            if (!this.pointerLocation) {
                this.pointerLocation = this.locationAtPickPoint(x, y);
            }

            if (!this.pointerLocation) {
                return;
            }

            var lookAtLocation = this.wwd.navigator.lookAtLocation;
            var location;

            if (amount < 1) {
                var distanceRemaining = Location.greatCircleDistance(lookAtLocation,
                    this.pointerLocation) * this.wwd.globe.equatorialRadius;

                if (distanceRemaining <= 50000) {
                    location = this.pointerLocation;
                }
                else {
                    location = Location.interpolateGreatCircle(amount, this.pointerLocation,
                        lookAtLocation, new Location(0, 0));
                }
            }
            else {
                var intermediateLocation = Location.interpolateGreatCircle(1 / amount, this.pointerLocation,
                    lookAtLocation, new Location(0, 0));

                var distanceRadians = Location.greatCircleDistance(lookAtLocation, intermediateLocation);

                var greatCircleAzimuthDegrees = Location.greatCircleAzimuth(lookAtLocation, intermediateLocation);

                location = Location.greatCircleLocation(lookAtLocation, greatCircleAzimuthDegrees - 180,
                    distanceRadians, new Location(0, 0));
            }

            lookAtLocation.latitude = location.latitude;
            lookAtLocation.longitude = location.longitude;
        };

        // Documented in super-class.
        BasicWorldWindowController.prototype.applyLimits = function () {
            // this.wwd.navigator.camera.applyLimits();
        };

        return BasicWorldWindowController;
    }
);
