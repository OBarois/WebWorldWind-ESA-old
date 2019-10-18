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
 * @exports DoubleBufferedFbo
 */
define([
    '../error/ArgumentError',
    '../util/Logger',
],
    function (
        ArgumentError,
        Logger) {
        'use strict';

        /**
         * Constructs a DoubleBufferedFbo.
         * @alias DoubleBufferedFbo
         * @constructor
         
         * @classdesc A DoubleBufferedFbo is typically used in offscreen rendering scenarios when the data from the previous frame is needed in the current frame.
         * Using two framebuffers backed by two textures avoids syncronization between the CPU and GPU.
         * Applications typically do not interact with this class.
         
         * @param {DrawContext} dc The current draw context.
         * @param {WebGLTexture} texture1 The texture for the first framebuffer.
         * @param {WebGLTexture} texture2 The texture for the second framebuffer.
         * @param {Number} width The width of the framebuffers, in pixels.
         * @param {Number} height The height of the framebuffers, in pixels.
         
         * @throws {ArgumentError} If the specified DrawContext or textures are missing, or if the width or height is less
         * than zero.
         */
        var DoubleBufferedFbo = function (dc, texture1, texture2, width, height) {
            if (!dc) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "DoubleBufferedFbo", "constructor",
                    "missing DrawContext"));
            }

            if (!texture1 || !texture2) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "DoubleBufferedFbo", "constructor",
                    "missing texture"));
            }

            if (width < 0 || height < 0) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "DoubleBufferedFbo", "constructor",
                    "The framebuffer width or height is less than zero."));
            }

            /**
             * The width of the framebuffers, in pixels.
             * @type {Number}
             * @readonly
             */
            this.width = width;

            /**
             * The height of the framebuffers, in pixels.
             * @type {Number}
             * @readonly
             */
            this.height = height;

            /**
             * Indicates the size of the framebuffers, in bytes.
             * @type {Number}
             * @readonly
             */
            this.size = width * height * 4 * 2;

            /**
             * @type {WebGLFramebuffer}
             */
            this.fbo1 = dc.currentGlContext.createFramebuffer();

            /**
             * @type {WebGLFramebuffer}
             */
            this.fbo2 = dc.currentGlContext.createFramebuffer();

            /**
             * @type {WebGLTexture}
             * @readonly
             */
            this.texture1 = texture1;

            /**
             * @type {WebGLTexture}
             * @readonly
             */
            this.texture2 = texture2;

            /**
             * Indicates if texture1 has been attached to the fbo1.
             * @type {Boolean}
             * @readonly
             */
            this.fbo1Complete = false;

            /**
             * Indicates if texture2 has been attached to the fbo2.
             * @type {Boolean}
             * @readonly
             */
            this.fbo2Complete = false;

            /**
             * Indicates which of the two framebuffers and textures is the primary one.
             * @type {Number}
             * @readonly
             */
            this.primary = 1;

            /**
             * Indicates if both framebuffers have been cleared using the clearFbo method.
             * Calling code must set this flag to false after rendering in one the the framebuffers.
             * @type {Boolean}
             */
            this.isCleared = true;
        };

        /**
         * Binds the primary fbo in the current WebGL graphics context.
         * @param {DrawContext} dc The current draw context.
         */
        DoubleBufferedFbo.prototype.bindFbo = function (dc) {
            var gl = dc.currentGlContext;
            var fbo = this.getPrimaryFbo();

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            this.ensureFboComplete(dc);
        };

        /**
         * Binds the primary texture in the current WebGL graphics context.
         * @param {DrawContext} dc The current draw context.
         */
        DoubleBufferedFbo.prototype.bind = function (dc) {
            var gl = dc.currentGlContext;
            var texture = this.getPrimaryTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            dc.frameStatistics.incrementTextureLoadCount(1);
            return true;
        };

        /**
         * Disposes of the WebGL textures and framebuffers.
         * @param {WebGLRenderingContext} gl
         */
        DoubleBufferedFbo.prototype.dispose = function (gl) {
            gl.deleteTexture(this.texture1);
            gl.deleteTexture(this.texture2);
            gl.deleteFramebuffer(this.fbo1);
            gl.deleteFramebuffer(this.fbo2);
            this.texture1 = undefined;
            this.texture2 = undefined;
            this.fbo1 = undefined;
            this.fbo2 = undefined;
        };

        /**
         * Gets the primary framebuffer.
         * @return {WebGLFramebuffer}
         */
        DoubleBufferedFbo.prototype.getPrimaryFbo = function () {
            if (this.primary === 1) {
                return this.fbo1;
            }
            return this.fbo2;
        };

        /**
         * Gets the secondary framebuffer.
         * @return {WebGLFramebuffer}
         */
        DoubleBufferedFbo.prototype.getSecondaryFbo = function () {
            if (this.primary === 1) {
                return this.fbo2;
            }
            return this.fbo1;
        };

        /**
         * Gets the primary texture.
         * @return {WebGLTexture}
         */
        DoubleBufferedFbo.prototype.getPrimaryTexture = function () {
            if (this.primary === 1) {
                return this.texture1;
            }
            return this.texture2;
        };

        /**
         * Gets the secondary texture.
         * @return {WebGLTexture}
         */
        DoubleBufferedFbo.prototype.getSecondaryTexture = function () {
            if (this.primary === 1) {
                return this.texture2;
            }
            return this.texture1;
        };

        /**
         * Clears both frambuffers using the gl.clear command.
         * Calling code must make sure to rebind to the previously used framebuffer and set the propper viewport.
         * @param {DrawContext} dc The current draw context.
         */
        DoubleBufferedFbo.prototype.clearFbo = function (dc) {
            if (this.isCleared) {
                return;
            }

            var gl = dc.currentGlContext;
            var glAllBuffers = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;

            this.bindFbo(dc);
            gl.clear(glAllBuffers);
            gl.viewport(0, 0, this.width, this.height);

            this.swap();

            this.bindFbo(dc);
            gl.clear(glAllBuffers);

            this.swap();

            this.isCleared = true;
        };

        /**
         * Swaps the primary and secondary framebuffer and texture.
         */
        DoubleBufferedFbo.prototype.swap = function () {
            if (this.primary === 1) {
                this.primary = 2;
            }
            else {
                this.primary = 1;
            }
        };

        /**
         * Ensures that the framebuffer has a texture attached.
         * @param {DrawContext} dc The current draw context.
         */
        DoubleBufferedFbo.prototype.ensureFboComplete = function (dc) {
            var gl = dc.currentGlContext;

            if (this.primary === 1 && !this.fbo1Complete) {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture1, 0);
                this.fbo1Complete = true;
            }
            else if (this.primary === 2 && !this.fbo2Complete) {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture2, 0);
                this.fbo2Complete = true;
            }
        };

        return DoubleBufferedFbo;
    });