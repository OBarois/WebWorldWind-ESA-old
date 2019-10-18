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
 * @exports GridParticleProgram
 */
define([
    '../error/ArgumentError',
    './GpuProgram',
    '../util/Logger'
],
    function (
        ArgumentError, 
        GpuProgram,
        Logger) {
        'use strict';

        /**
         * Constructs a new program.
         * Initializes, compiles and links this GLSL program with the source code for its vertex and fragment shaders.
         * <p>
         * This method creates WebGL shaders for the program's shader sources and attaches them to a new GLSL program.
         * This method then compiles the shaders and then links the program if compilation is successful.
         * Use the bind method to make the program current during rendering.
         *
         * @alias GridParticleProgram
         * @constructor
         * @augments GpuProgram
         * @classdesc GridParticleProgram is a GLSL program that draws points and trails representing movement.
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @throws {ArgumentError} If the shaders cannot be compiled, or linking of the compiled shaders into a program
         * fails.
         */
        var GridParticleProgram = function (gl) {
            var vertexShaderSource =
                'attribute vec2 vertexPosition;\n' +

                'uniform mediump int drawMode;\n' +

                //uniforms for MODE_DRAW_PARTICLES
                'uniform sampler2D simParticleSampler;\n' +
                'uniform float simTextureDimension;\n' +
                'uniform vec4 bbox;\n' +

                'varying vec2 texureCoord;\n' +

                'const int MODE_TEX_COPY_FADE = 0;\n' +
                'const int MODE_DRAW_PARTICLES = 1;\n' +

                'const vec2 bitEnc = vec2(1.0, 255.0);\n' +
                'const vec2 bitDec = 1.0 / bitEnc;\n' +

                'vec2 decodePositionFromRGBA(const vec4 color) {\n' +
                '   vec4 roundedColor = floor(color * 255.0 + 0.5) / 255.0;\n' +
                '   float x = dot(roundedColor.rg, bitDec);\n' +
                '   float y = dot(roundedColor.ba, bitDec);\n' +
                '   return vec2(x, y);\n' +
                '}\n' +

                'void main() {\n' +
                '   if (drawMode == MODE_TEX_COPY_FADE) {\n' +
                '       texureCoord = vertexPosition;\n' +
                '       gl_Position = vec4(1.0 - 2.0 * vertexPosition, 0, 1);\n' +
                '   }\n' +
                '   else {\n' +
                '       float row = vertexPosition.x / simTextureDimension;\n' +
                '       vec2 uv = vec2(fract(row), floor(row) / simTextureDimension);\n' +
                '       vec4 color = texture2D(simParticleSampler, uv);\n' +
                '       vec2 pos = decodePositionFromRGBA(color);\n' +
                '       texureCoord = bbox.xy + pos * (bbox.zw - bbox.xy);' +
                '       gl_Position = vec4((2.0 * pos.x - 1.0), (2.0 * pos.y - 1.0), 0.0, 1.0);\n' +
                '       gl_PointSize = 1.0;\n' +
                '   }\n' +
                '}';

            var fragmentShaderSource =
                'precision mediump float;\n' +

                'uniform sampler2D tileOrColorsSampler;\n' +
                'uniform mediump int drawMode;\n' +

                //uniforms for MODE_TEX_COPY_FADE
                //tileOrColorsSampler is used as the tile texture sampler
                'uniform float fadeOpacity;\n' +

                //uniforms for MODE_DRAW_PARTICLES
                //tileOrColorsSampler is used as the colors gradient sampler
                'uniform sampler2D gridSampler;\n' +
                'uniform vec4 gridMinMax;\n' +

                'varying vec2 texureCoord;\n' +

                'const int MODE_TEX_COPY_FADE = 0;\n' +
                'const int MODE_DRAW_PARTICLES = 1;\n' +

                'void main() {\n' +
                '   if (drawMode == MODE_TEX_COPY_FADE) {\n' +
                '       vec4 color = texture2D(tileOrColorsSampler, 1.0 - texureCoord);\n' +
                '       gl_FragColor = vec4(floor(255.0 * color * fadeOpacity) / 255.0);\n' +
                '   }\n' +
                '   else {\n' +
                '       vec2 gridVector = mix(gridMinMax.xy, gridMinMax.zw, texture2D(gridSampler, texureCoord).rg);\n' +
                '       float normalizedDistance = length(gridVector) / length(gridMinMax.zw);\n' +
                '       vec2 textCoord = vec2(fract(16.0 * normalizedDistance), floor(16.0 * normalizedDistance) / 16.0);\n' +
                '       gl_FragColor = texture2D(tileOrColorsSampler, textCoord);\n' +
                '   }\n' +
                '}';

            GpuProgram.call(this, gl, vertexShaderSource, fragmentShaderSource, ['vertexPosition']);

            /**
             * The WebGL location for this program's 'vertexPosition' attribute.
             * @type {Number}
             * @readonly
             */
            this.vertexPositionLocation = this.attributeLocation(gl, 'vertexPosition');

            /**
             * The WebGL location for this program's 'simParticleSampler' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.simParticleSamplerLocation =  this.uniformLocation(gl, 'simParticleSampler');

            /**
             * The WebGL location for this program's 'simTextureDimension' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.simTextureDimensionLocation = this.uniformLocation(gl, 'simTextureDimension');

            /**
             * The WebGL location for this program's 'drawMode' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.drawModeLocation = this.uniformLocation(gl, 'drawMode');

            /**
             * The WebGL location for this program's 'tileOrColorsSampler' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.tileOrColorsSamplerLocation = this.uniformLocation(gl, 'tileOrColorsSampler');

            /**
             * The WebGL location for this program's 'fadeOpacity' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.fadeOpacityLocation = this.uniformLocation(gl, 'fadeOpacity');

            /**
             * The WebGL location for this program's 'gridSampler' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.gridSamplerLocation = this.uniformLocation(gl, 'gridSampler');

            /**
             * The WebGL location for this program's 'gridMinMax' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.gridMinMaxLocation = this.uniformLocation(gl, 'gridMinMax');

            /**
             * The WebGL location for this program's 'bbox' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.bboxLocation = this.uniformLocation(gl, 'bbox');

            //The two modes this program can render.
            
            //Copies and fades data from the previous frame.
            this.MODE_TEX_COPY_FADE = 0;

            //Drawn particles.
            this.MODE_DRAW_PARTICLES = 1;
        };

        /**
         * A string that uniquely identifies this program.
         * @type {string}
         * @readonly
         */
        GridParticleProgram.key = 'WorldWindGpuGridParticleProgram';

        GridParticleProgram.prototype = Object.create(GpuProgram.prototype);

        /**
         * Loads the specified number as the value of this program's 'simParticleSamplerLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} unit The texture unit.
         */
        GridParticleProgram.prototype.loadSimParticleSamper = function (gl, unit) {
            gl.uniform1i(this.simParticleSamplerLocation, unit - gl.TEXTURE0);
        };

        /**
         * Loads the specified dimension as the value of this program's 'simTextureDimensionLocation' uniform variable..
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} dimension The dimension (width or height) of the sim texture. The sim texture's width and height are assumed to be equal.
         * @throws {ArgumentError} If the specified dimension is missing.
         */
        GridParticleProgram.prototype.loadSimTextureDimension = function (gl, dimension) {
            if (dimension == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadSimTextureDimension', 'missing dimension'));
            }
            gl.uniform1f(this.simTextureDimensionLocation, dimension);
        };

        /**
         * Loads the specified value as the value of this program's 'drawModeLocation' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} drawMode 
         */
        GridParticleProgram.prototype.loadDrawMode = function (gl, drawMode) {
            gl.uniform1i(this.drawModeLocation, drawMode);
        };

        /**
         * Loads the specified number as the value of this program's 'tileOrColorsSamplerLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} unit The texture unit.
         */
        GridParticleProgram.prototype.loadTileOrColorsSampler = function (gl, unit) {
            gl.uniform1i(this.tileOrColorsSamplerLocation, unit - gl.TEXTURE0);
        };

        /**
         * Loads the specified number as the value of this program's 'tileOrColorsSamplerLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} fadeOpacity Controls how fast the particle trails fade on each frame.
         * @throws {ArgumentError} If the specified fadeOpacity is missing.
         */
        GridParticleProgram.prototype.loadFadeOpacity = function (gl, fadeOpacity) {
            if (fadeOpacity == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadFadeOpacity', 'missing fadeOpacity'));
            }
            gl.uniform1f(this.fadeOpacityLocation, fadeOpacity);
        };

        /**
         * Loads the specified number as the value of this program's 'gridSamplerLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} unit The texture unit.
         */
        GridParticleProgram.prototype.loadGridSampler = function (gl, unit) {
            gl.uniform1i(this.gridSamplerLocation, unit - gl.TEXTURE0);
        };

        /**
         * Loads the min and max u and v vectors of the grid as the value of this program's 'gridMinMaxLocation' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} uMin The minimum u value of the grid data.
         * @param {Number} vMin The minimum v value of the grid data.
         * @param {Number} uMax The maximum u value of the grid data.
         * @param {Number} vMax The maximum v value of the grid data.
         * @throws {ArgumentError} If the specified u and v values are missing.
         */
        GridParticleProgram.prototype.loadGridMinMax = function (gl, uMin, vMin, uMax, vMax) {
            if (uMin == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadGridMinMax', 'missing uMin'));
            }
            if (vMin == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadGridMinMax', 'missing vMin'));
            }
            if (uMax == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadGridMinMax', 'missing uMax'));
            }
            if (vMax == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadGridMinMax', 'missing vMax'));
            }
            gl.uniform4f(this.gridMinMaxLocation, uMin, vMin, uMax, vMax);
        };

        /**
         * Loads the specified bbox as the value of this program's 'bboxLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Float32Array} bbox A normalised bounding box. (0, 0) is in the top left corner and (1, 1) is in the bottom right corner.
         * @throws {ArgumentError} If the specified bbox is missing.
         */
        GridParticleProgram.prototype.loadBbox = function (gl, bbox) {
            if (bbox == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleProgram', 'loadBbox', 'missing bbox'));
            }
            gl.uniform4fv(this.bboxLocation, bbox);
        };

        return GridParticleProgram;
    });