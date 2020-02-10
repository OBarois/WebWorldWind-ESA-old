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
 * @exports PanRecognizer
 */
define(['../gesture/GestureRecognizer'],
    function (GestureRecognizer) {
        "use strict";

        /**
         * Constructs a pan gesture recognizer.
         * @alias PanRecognizer
         * @constructor
         * @augments GestureRecognizer
         * @classdesc A concrete gesture recognizer subclass that looks for touch panning gestures.
         * @param {EventTarget} target The document element this gesture recognizer observes for mouse and touch events.
         * @param {Function} callback An optional function to call when this gesture is recognized. If non-null, the
         * function is called when this gesture is recognized, and is passed a single argument: this gesture recognizer,
         * e.g., <code>gestureCallback(recognizer)</code>.
         * @throws {ArgumentError} If the specified target is null or undefined.
         */
        var PanRecognizer = function (target, callback) {
            GestureRecognizer.call(this, target, callback);

            /**
             *
             * @type {Number}
             */
            this.minNumberOfTouches = 1;

            /**
             *
             * @type {Number}
             */
            this.maxNumberOfTouches = Number.MAX_VALUE;

                        /**
             *
             * @type {Number}
             */
            this.requiredTouches = 1;

            // Intentionally not documented.
            this.interpretDistance = 20;

            this.numberOfTaps = 1;
            this.tapCounter = 0;
            this.maxTapInterval = 300;

        };

        PanRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        // Documented in superclass.
        PanRecognizer.prototype.reset = function () {
            console.log("pan reset (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
            GestureRecognizer.prototype.reset.call(this);
            this.tapCounter = 0;
            this.cancelFailAfterDelay();

        };
        // Documented in superclass.
        PanRecognizer.prototype.mouseDown = function (event) {
            if (this.state == WorldWind.POSSIBLE) {
                console.log("mouse causes FAIL")
                this.state = WorldWind.FAILED; // touch gestures fail upon receiving a mouse event
            }
        };

        PanRecognizer.prototype.touchStart = function (event) {
            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            if ( this.shouldRecognize() ) {

                this.tapCounter += 1;
                if ( this.numberOfTaps > 1 ) this.failAfterDelay(this.maxTapInterval)
                if ( this.tapCounter > this.numberOfTaps  ) this.state = WorldWind.FAILED;
    
                console.log("pan recognized start (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+")")
            }


        };


        // Documented in superclass.
        PanRecognizer.prototype.touchMove = function (touch) {
            // console.log("pan  move (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
            if (this.state == WorldWind.POSSIBLE) {
                if (this.shouldInterpret()) {
                    if (this.shouldRecognize()) {
                        console.log("pan first move (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
                        this.state = WorldWind.BEGAN;
                    }
                }
            } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                console.log("pan state to changed (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
                this.state = WorldWind.CHANGED;
            }
        };

        // Documented in superclass.
        PanRecognizer.prototype.touchEnd = function (touch) {
            // if (this.touchCount == 0) { // last touch ended
            //     if (this.state == WorldWind.POSSIBLE) {
            //         this.state = WorldWind.FAILED;
            //     } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
            //         console.log("pan  ended (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
            //         this.state = WorldWind.ENDED;
            //     }
            // }
        };

        // Documented in superclass.
        PanRecognizer.prototype.touchCancel = function (touch) {
            if (this.touchCount == 0) { // last touch cancelled
                if (this.state == WorldWind.POSSIBLE) {
                    this.state = WorldWind.FAILED;
                } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.state = WorldWind.CANCELLED;
                }
            }
        };

        // Documented in superclass.
        PanRecognizer.prototype.prepareToRecognize = function () {
            // set translation to zero when the pan begins
            this.translationX = 0;
            this.translationY = 0;
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PanRecognizer.prototype.shouldInterpret = function () {
            var dx = this.translationX,
                dy = this.translationY,
                distance = Math.sqrt(dx * dx + dy * dy);
                // console.log("pan shouldInterpret (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / distance: "+distance+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
                return (distance > this.interpretDistance && this.numberOfTaps == this.tapCounter); // interpret touches when the touch centroid moves far enough
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PanRecognizer.prototype.shouldRecognize = function () {
            var touchCount = this.touchCount;
            // console.log("pan shouldRecognize (numberOfTaps: "+this.numberOfTaps+" / tapCounter: "+this.tapCounter+" / touches: "+this.touchCount+" min/max: "+this.minNumberOfTouches+"/"+this.maxNumberOfTouches+")")
            return touchCount != 0
                && touchCount >= this.minNumberOfTouches
                && touchCount <= this.maxNumberOfTouches
        };

        // Intentionally not documented.
        PanRecognizer.prototype.failAfterDelay = function (delay) {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
            }

            self.timeout = window.setTimeout(function () {
                self.timeout = null;
                if (self.state == WorldWind.POSSIBLE || self.state == WorldWind.BEGAN) {
                    self.state = WorldWind.FAILED; // fail if we haven't already reached a terminal state
                }
            }, delay);
        };

        // Intentionally not documented.
        PanRecognizer.prototype.cancelFailAfterDelay = function () {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
                self.timeout = null;
            }
        };
        

        return PanRecognizer;
    });
