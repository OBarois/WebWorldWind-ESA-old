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
 * @exports GridParticleSimProgram
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
         * This method creates WebGL shaders for the program's shader sources and attaches them to a new GLSL program. This
         * method then compiles the shaders and then links the program if compilation is successful. Use the bind method to make the
         * program current during rendering.
         *
         * @alias GridParticleSimProgram
         * @constructor
         * @augments GpuProgram
         * @classdesc GridParticleSimProgram is a GLSL program that simulates particle movement.
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @throws {ArgumentError} If the shaders cannot be compiled, or linking of
         * the compiled shaders into a program fails.
         */
        var GridParticleSimProgram = function (gl) {
            var vertexShaderSource =
                'attribute vec2 vertexPosition;\n' +

                'varying vec2 texureCoord;\n' +

                'void main() {\n' +
                '    texureCoord = vertexPosition;\n' +
                '    gl_Position = vec4(1.0 - 2.0 * vertexPosition, 0, 1);\n' +
                '}';

            var fragmentShaderSource =
                '#ifdef GL_FRAGMENT_PRECISION_HIGH\n' +
                'precision highp float;\n' +
                '#else\n' +
                'precision mediump float;\n' +
                '#endif\n' +

                'uniform sampler2D particleSampler;\n' +
                'uniform sampler2D gridSampler;\n' +
                'uniform vec2 gridDimensions;\n' +
                'uniform vec4 gridMinMax;\n' +
                'uniform float randSeed;\n' +
                'uniform float speedFactor;\n' +
                'uniform float dropRate;\n' +
                'uniform float dropRateMultiplier;\n' +
                'uniform vec4 bbox;\n' +

                'varying vec2 texureCoord;\n' +

                'const vec2 bitEnc = vec2(1.0, 255.0);\n' +
                'const vec2 bitDec = 1.0 / bitEnc;\n' +

                // pseudo-random generator
                'const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\n' +
                'float rand(const vec2 co) {\n' +
                '   float t = dot(rand_constants.xy, co);\n' +
                '   return fract(sin(t) * (rand_constants.z + t));\n' +
                '}\n' +

                // bilinear filtering based on 4 adjacent pixels for smooth interpolation
                'vec2 lookupGridVector(const vec2 uv) {\n' +
                '   vec2 px = 1.0 / gridDimensions;\n' +
                '   vec2 vc = (floor(uv * gridDimensions)) * px;\n' +
                '   vec2 f = fract(uv * gridDimensions);\n' +
                '   vec2 tl = texture2D(gridSampler, vc).rg;\n' +
                '   vec2 tr = texture2D(gridSampler, vc + vec2(px.x, 0)).rg;\n' +
                '   vec2 bl = texture2D(gridSampler, vc + vec2(0, px.y)).rg;\n' +
                '   vec2 br = texture2D(gridSampler, vc + px).rg;\n' +
                '   return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\n' +
                '}\n' +

                'vec2 decodePositionFromRGBA(const vec4 color) {\n' +
                '   vec4 rounded_color = floor(color * 255.0 + 0.5) / 255.0;\n' +
                '   float x = dot(rounded_color.rg, bitDec);\n' +
                '   float y = dot(rounded_color.ba, bitDec);\n' +
                '   return vec2(x, y);\n' +
                '}\n' +

                'vec4 encodePositionToRGBA(const vec2 pos) {\n' +
                '   vec2 rg = bitEnc * pos.x;\n' +
                '   rg = fract(rg);\n' +
                '   rg -= rg.yy * vec2(1.0 / 255.0, 0.0);\n' +

                '   vec2 ba = bitEnc * pos.y;\n' +
                '   ba = fract(ba);\n' +
                '   ba -= ba.yy * vec2(1.0 / 255.0, 0.0);\n' +

                '   return vec4(rg, ba);\n' +
                '}\n' +

                'void main() {\n' +
                '   vec4 color = texture2D(particleSampler, texureCoord);\n' +
                '   vec2 pos = decodePositionFromRGBA(color);\n' +
                '   vec2 global_pos = bbox.xy + pos * (bbox.zw - bbox.xy);\n' +

                '   vec2 normalizedGridVector = lookupGridVector(global_pos);\n' +
                '   vec2 gridVector = mix(gridMinMax.xy, gridMinMax.zw, normalizedGridVector);\n' +
                '   float normalizedDistance = length(gridVector) / length(gridMinMax.zw);\n' +

                //particles closer to the poles should move faster
                '   float distortion = max(cos(radians(global_pos.y * 180.0 - 90.0)), 0.00001);\n' +

                //reduce particle speed as we are not using real earth dimensions for the texture 
                '   float speedReduction = 0.0001;\n' +
                '   vec2 offset = vec2(gridVector.x / distortion, -gridVector.y) * speedReduction * speedFactor;\n' +

                // update particle position, wrapping around the date line
                '   pos = fract(1.0 + pos + offset);\n' +

                // randomly restart a particle at random position, to avoid degeneration
                '   float dropRating = dropRate + normalizedDistance * dropRateMultiplier;\n' +
                '   vec2 seed = (pos + texureCoord) * randSeed;\n' +
                '   float retain = step(dropRating, rand(seed));\n' +
                
                '   vec2 randomPos = vec2(rand(seed + 1.3), 1.0 - rand(seed + 2.1));\n' +
                '   pos = mix(pos, randomPos, 1.0 - retain);\n' +

                '    gl_FragColor = encodePositionToRGBA(pos);\n' +
                '}'

            // Call to the superclass, which performs shader program compiling and linking.
            GpuProgram.call(this, gl, vertexShaderSource, fragmentShaderSource, ['vertexPosition']);

            /**
             * The WebGL location for this program's 'vertexPosition' attribute.
             * @type {Number}
             * @readonly
             */
            this.vertexPointLocation = this.attributeLocation(gl, 'vertexPosition');

            /**
             * The WebGL location for this program's 'particleSampler' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.particleSamplerLocation = this.uniformLocation(gl, "particleSampler");

            /**
             * The WebGL location for this program's 'gridSampler' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.gridSamplerLocation = this.uniformLocation(gl, 'gridSampler');

            /**
             * The WebGL location for this program's 'gridDimensions' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.gridDimensionsLocation = this.uniformLocation(gl, 'gridDimensions');

            /**
             * The WebGL location for this program's 'gridMinMax' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.gridMinMaxLocation = this.uniformLocation(gl, 'gridMinMax');

            /**
             * The WebGL location for this program's 'randSeed' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.randSeedLocation = this.uniformLocation(gl, 'randSeed');

            /**
             * The WebGL location for this program's 'speedFactor' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.speedFactorLocation = this.uniformLocation(gl, 'speedFactor');

            /**
             * The WebGL location for this program's 'dropRate' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.dropRateLocation = this.uniformLocation(gl, 'dropRate');

            /**
             * The WebGL location for this program's 'dropRateMultiplier' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.dropRateMultiplierLocation = this.uniformLocation(gl, 'dropRateMultiplier');

            /**
             * The WebGL location for this program's 'bbox' uniform.
             * @type {WebGLUniformLocation}
             * @readonly
             */
            this.bboxLocation = this.uniformLocation(gl, 'bbox');
        };

        /**
         * A string that uniquely identifies this program.
         * @type {string}
         * @readonly
         */
        GridParticleSimProgram.key = 'WorldWindGpuGridParticleSimProgram';

        // Inherit from GpuProgram.
        GridParticleSimProgram.prototype = Object.create(GpuProgram.prototype);

        /**
         * Loads the specified width and height as the value of this program's 'gridDimensions' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} width The width of the grid.
         * @param {Number} height The height of the grid.
         * @throws {ArgumentError} If the specified width or height are missing.
         */
        GridParticleSimProgram.prototype.loadGridDimensions = function (gl, width, height) {
            if (width == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadGridDimensions', 'missing width'));
            }
            if (height == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadGridDimensions', 'missing height'));
            }
            gl.uniform2f(this.gridDimensionsLocation, width, height);
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
        GridParticleSimProgram.prototype.loadGridMinMax = function (gl, uMin, vMin, uMax, vMax) {
            if (uMin == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadGridMinMax', 'missing uMin'));
            }
            if (vMin == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadGridMinMax', 'missing vMin'));
            }
            if (uMax == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadGridMinMax', 'missing uMax'));
            }
            if (vMax == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadGridMinMax', 'missing vMax'));
            }
            gl.uniform4f(this.gridMinMaxLocation, uMin, vMin, uMax, vMax);
        };

        /**
         * Loads a random value as the value of this program's 'randSeedLocation' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} seed A random value between [0, 1).
         * @throws {ArgumentError} If the specified value is missing.
         */
        GridParticleSimProgram.prototype.loadRandSeed = function (gl, seed) {
            if (seed == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadRandSeed', 'missing seed'));
            }
            gl.uniform1f(this.randSeedLocation, seed);
        };

        /**
         * Loads the specified speedFactor as the value of this program's 'speedFactorLocation' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} speedFactor Controls how fast the particles move.
         * @throws {ArgumentError} If the specified speedFactor value is missing.
         */
        GridParticleSimProgram.prototype.loadSpeedFactor = function (gl, speedFactor) {
            if (speedFactor == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadSpeedFactor', 'missing speedFactor'));
            }
            gl.uniform1f(this.speedFactorLocation, speedFactor);
        };

        /**
         * Loads the specified dropRate as the value of this program's 'dropRateLocation' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} dropRate Controls how often the particles move to a random place.
         * @throws {ArgumentError} If the specified dropRate value is missing.
         */
        GridParticleSimProgram.prototype.loadDropRate = function (gl, dropRate) {
            if (dropRate == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadDropRate', 'missing dropRate'));
            }
            gl.uniform1f(this.dropRateLocation, dropRate);
        };

        /**
         * Loads the specified dropRateMultiplier as the value of this program's 'dropRateMultiplierLocation' uniform variable.
         *
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} dropRateMultiplier Controls the drop rate of a particle relative to individual particle speed.
         * @throws {ArgumentError} If the specified dropRateMultiplier value is missing.
         */
        GridParticleSimProgram.prototype.loadDropRateMultiplier = function (gl, dropRateMultiplier) {
            if (dropRateMultiplier == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadDropRateMultiplier', 'missing dropRateMultiplier'));
            }
            gl.uniform1f(this.dropRateMultiplierLocation, dropRateMultiplier);
        };

        /**
         * Loads the specified bbox as the value of this program's 'bboxLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Float32Array} bbox A normalised bounding box. (0, 0) is in the top left corner and (1, 1) is in the bottom right corner.
         * @throws {ArgumentError} If the specified bbox is missing.
         */
        GridParticleSimProgram.prototype.loadBbox = function (gl, bbox) {
            if (bbox == null) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, 'GridParticleSimProgram', 'loadBbox', 'missing bbox'));
            }
            gl.uniform4fv(this.bboxLocation, bbox);
        };

        /**
         * Loads the specified number as the value of this program's 'gridSamplerLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} unit The texture unit.
         */
        GridParticleSimProgram.prototype.loadGridSampler = function (gl, unit) {
            gl.uniform1i(this.gridSamplerLocation, unit - gl.TEXTURE0);
        };

        /**
         * Loads the specified number as the value of this program's 'particleSamplerLocation' uniform variable.
         * 
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {Number} unit The texture unit.
         */
        GridParticleSimProgram.prototype.loadParticleSamper = function (gl, unit) {
            gl.uniform1i(this.particleSamplerLocation, unit - gl.TEXTURE0);
        };

        return GridParticleSimProgram;
    });