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
 * @exports GriddedDataLayer
 */
define([
    '../render/DoubleBufferedFbo',
    '../shaders/GridParticleProgram',
    '../shaders/GridParticleSimProgram',
    '../geom/Location',
    '../geom/Sector',
    './TiledImageLayer',
    '../util/WWMath',
    '../util/WWUtil'
],
    function (
        DoubleBufferedFbo,
        GridParticleProgram,
        GridParticleSimProgram,
        Location,
        Sector,
        TiledImageLayer,
        WWMath,
        WWUtil) {
        'use strict';

        /**
         * Constructs a GriddedDataLayer.
         * 
         * The GriddedDataLayer displays vector GRIB data as moving particles with trails.
         * The GRIB data is loaded from a JSON file as outputed by the grib2json library.
         * Alternatively apps can load the JSON file themselves and set the gridData property.
         * 
         * @example
         * var windLayer = new GriddedDataLayer('Wind', './wind.json');
         * 
         * @example
         * var windLayer = new GriddedDataLayer('Wind');
         * fetch('./wind.json')
         *     .then(res => res.json())
         *     .then(windGribData => windLayer.gridData = windLayer.createGridData(windGribData));
         *
         * @alias GriddedDataLayer
         * @constructor
         * @augments TiledImageLayer
         * @classdesc A GriddedDataLayer layer for visualising vector data.
         * @param {String} displayName This layer's display name.
         * @param {String} gridDataUrl An url from which to load the grib data
         */
        var GriddedDataLayer = function (displayName, gridDataUrl) {
            var numLevels = 16;
            var baseCacheKey = 'GriddedDataLayer_' + WWUtil.guid();
            var tileWidth = 256;
            var tileHeight = 256;
            TiledImageLayer.call(this, new Sector(-90, 90, -180, 180), new Location(45, 45), numLevels, 'image/png', baseCacheKey, tileWidth, tileHeight);

            this.displayName = displayName || 'GriddedDataLayer';

            //Documented in defineProperties below.
            this._numParticles = 16384;

             //Documented in defineProperties below.
             this._colors = {
                0.0: '#3288bd',
                0.1: '#66c2a5',
                0.2: '#abdda4',
                0.3: '#e6f598',
                0.4: '#fee08b',
                0.5: '#fdae61',
                0.6: '#f46d43',
                1.0: '#d53e4f'
            };

            /**
             * Controls how fast the particle trails fade on each frame.
             * A number between [0, 1)
             * @type {Number}
             * @default 0.996
             */
            this.fadeOpacity = 0.996;
            
            /**
             * Controls how fast the particles move
             * @type {Number}
             * @default 0.25
             */
            this.speedFactor = 0.25;
            
            /**
             * Controls how often the particles move to a random place
             * @type {Number}
             * @default 0.003
             */
            this.dropRate = 0.003;
            
            /**
             * Controls the drop rate of a particle relative to individual particle speed.
             * @type {Number}
             * @default 0.01
             */
            this.dropRateMultiplier = 0.01;

            /**
             * Rendering pauses when the globe is moving and resumes some time after the globe is not moving anymore.
             * The time, in miliseconds, after which rendering resumes.
             * @type {Number}
             * @default 334
             */
            this.waitTime = 334;

            /**
             * The gridData as outputed by the createGridData method.
             * @type {Object}
             */
            this.gridData = null;

            /**
             * Reduces the eye altitude by the specified amount (default is 15%).
             * By reducing the eye a more precise boundig secor cand be determined by culling tile on the edges of the globe.
             * Setting this value to 0 will render all visible tiles.
             * @type {Number}
             * @default 0.15
             */
            this.eyeAltitudeReduction = 0.15;

            /**
             * Specifies the maxmimum altitude at which visible tile will be culled.
             * At altitudes higher than this value all visible tiles are rendered (eyeAltitudeReduction is considred to be 0)
             * @type {Number}
             * @default 20e6
             */
            this.eyeAltitudeReductionTrehshold = 20e6;

             /**
             * The bounding sector of this layer as computed from the tiles.
             * @type {Sector}
             * @readonly
             */
            this.sector = new Sector(-90, 90, -180, 180);

            //Internal use only.
            //url for the GRIB JSON file.
            this._gridDataUrl = gridDataUrl;

            //Internal use only.
            //The width and height of the sim texture.
            this._simTextureResolution = 128;

            //Internal use only.
            //The width and height of the ground texture.
            this._groundTextureResolution = 2048;

            //Internal use only.
            //A flag to indicate the GRIB data is currently being retrieved.
            this._loadInProgress = false;

            //Internal use only.
            //A normalised bounding box.
            this._bbox = new Float32Array([0, 0, 1, 1]);

            //Internal use only.
            //The time, in miliseconds, when the last fbo clear happned.
            this._lastGroundFboClear = 0;

            //Internal use only.
            //A flag to indicate that an fbo clear is necessary 
            this._requiresFboClear = false;

            //Internal use only.
            //gpuCacheKeys
            this._simTextureKey = baseCacheKey + '_simTexture';
            this._simTextureKey1 = baseCacheKey + '_simTexture1';
            this._simTextureKey2 = baseCacheKey + '_simTexture2';
            this._colorsTextureKey = baseCacheKey + '_colorsTexture';
            this._gridTextureKey = baseCacheKey + '_gridTexure';
            this._groundTextureKey = baseCacheKey + '_groundTexure';
            this._groundTextureKey1 = baseCacheKey + '_groundTexure1';
            this._groundTextureKey2 = baseCacheKey + '_groundTexure2';
            this._particleVboKey = baseCacheKey + '_particleVbo';
            this._quadVboKey = baseCacheKey + '_quadVbo'; 
        };

        GriddedDataLayer.prototype = Object.create(TiledImageLayer.prototype);

        Object.defineProperties(GriddedDataLayer.prototype, {
            /**
             * The number of particles to render.
             * @memberof GriddedDataLayer.prototype
             * @type {Number}
             * @default 16384
             */
            numParticles: {
                get: function () {
                    return this._numParticles;
                },
                set: function (numParticles) {
                    this._simTextureResolution = Math.ceil(Math.sqrt(numParticles));
                    this._numParticles = this._simTextureResolution * this._simTextureResolution;

                    var baseCacheKey = 'GriddedDataLayer_' + WWUtil.guid();
                    this._simTextureKey = baseCacheKey + '_simTexture';
                    this._simTextureKey1 = baseCacheKey + '_simTexture1';
                    this._simTextureKey2 = baseCacheKey + '_simTexture2';
                    this._particleVboKey = baseCacheKey + '_particleVbo';

                    this._requiresFboClear = true;
                }
            },

            /**
             * An object describing a color gradient.
             * The keys are the color stops (between 0 and 1) and the values are valid CSS colors.
             * @memberof GriddedDataLayer.prototype
             * @type {Object}
             */
            colors: {
                get: function () {
                    return this._colors;
                },
                set: function (colors) {
                    this._colors = colors;

                    var baseCacheKey = 'GriddedDataLayer_' + WWUtil.guid();
                    this._colorsTextureKey = baseCacheKey + '_colorsTexture';

                    this._requiresFboClear = true;
                }
            }
        });

        // Documented in superclass.
        GriddedDataLayer.prototype.doRender = function (dc) {
            dc.redrawRequested = true;

            if (!dc.terrain) {
                return;
            }

            if (!this.gridData) {
                this.loadGridData(this._gridDataUrl);
                return;
            }

            var mvpMatrixChanged = !dc.modelviewProjection.equals(this.lasTtMVP);

            if (this.currentTilesInvalid
                || mvpMatrixChanged
                || dc.globeStateKey !== this.lastGlobeStateKey) {
                this.currentTilesInvalid = false;

                this.assembleTiles(dc);

                if (!dc.globe.is2D()) {
                    this.currentTiles = this.cullTilesHorizon(dc, this.currentTiles);
                }

                if (mvpMatrixChanged) {
                    this._requiresFboClear = true;
                }
            }

            this.lasTtMVP.copy(dc.modelviewProjection);
            this.lastGlobeStateKey = dc.globeStateKey;

            if (this.currentTiles.length > 0) {
                if (this._requiresFboClear) {
                    this.clearGroundFbo(dc);
                }

                if (Date.now() - this._lastGroundFboClear <= this.waitTime) {
                    return;
                }

                try {
                    this.renderToTexture(dc);
                }
                finally {
                    this.restoreGLState(dc);
                }

                dc.surfaceTileRenderer.renderTiles(dc, [this], this.opacity, dc.surfaceOpacity >= 1);
                dc.frameStatistics.incrementImageTileCount(1);

                this.inCurrentFrame = true;
            }
        };

        /**
         * Renders the grid data as particles with trails to an offsreeen framebuffer.
         * @param {DrawContext} dc
         */
        GriddedDataLayer.prototype.renderToTexture = function (dc) {
            var gl = dc.currentGlContext;
            var gpuResourceCache = dc.gpuResourceCache;
            var glAllBuffers = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;

            var groundKey = this._groundTextureKey;
            var simKey = this._simTextureKey;
            if (dc.globe.offset === 1) {
                groundKey = this._groundTextureKey1;
                simKey = this._simTextureKey1;
            }
            else if (dc.globe.offset === -1) {
                groundKey = this._groundTextureKey2;
                simKey = this._simTextureKey2;
            }

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.STENCIL_TEST);
            gl.blendFunc(gl.ONE, gl.ZERO);

            gl.activeTexture(gl.TEXTURE0);
            var gridTexture = gpuResourceCache.resourceForKey(this._gridTextureKey);
            if (!gridTexture) {
                gridTexture = this.createGridTexture(dc, this._gridTextureKey);
            }
            gl.bindTexture(gl.TEXTURE_2D, gridTexture);
            dc.frameStatistics.incrementTextureLoadCount(1);

            gl.activeTexture(gl.TEXTURE1);
            var simFbo = gpuResourceCache.resourceForKey(simKey);
            if (!simFbo) {
                simFbo = this.createSimFbo(dc, simKey);
            }
            gl.bindTexture(gl.TEXTURE_2D, simFbo.getSecondaryTexture());
            dc.frameStatistics.incrementTextureLoadCount(1);

            var quadBuffer = gpuResourceCache.resourceForKey(this._quadVboKey);
            if (!quadBuffer) {
                quadBuffer = this.createQuadVbo(dc);
            }

            var particleVbo = gpuResourceCache.resourceForKey(this._particleVboKey);
            if (!particleVbo) {
                particleVbo = this.createParticleVbo(dc);
            }

            var colorsTexure = gpuResourceCache.resourceForKey(this._colorsTextureKey);
            if (!colorsTexure) {
                colorsTexure = this.createColorsTexture(dc, this._colorsTextureKey);
            }

            var groundFbo = gpuResourceCache.resourceForKey(groundKey);
            if (!groundFbo) {
                groundFbo = this.createGroundFbo(dc, groundKey);
            }

            var sector = this.getBoundingSector(this.currentTiles, this.sector);
            var bbox = this.getBoundingBox(sector, this._bbox);

            var program = dc.findAndBindProgram(GridParticleProgram);
            gl.enableVertexAttribArray(0);
            gl.activeTexture(gl.TEXTURE2);

            program.loadGridSampler(gl, gl.TEXTURE0);
            program.loadSimParticleSamper(gl, gl.TEXTURE1);
            program.loadTileOrColorsSampler(gl, gl.TEXTURE2);
            program.loadFadeOpacity(gl, this.fadeOpacity);
            program.loadSimTextureDimension(gl, this._simTextureResolution);
            program.loadGridMinMax(gl, this.gridData.uMin, this.gridData.vMin, this.gridData.uMax, this.gridData.vMax);


            groundFbo.bindFbo(dc);
            gl.clear(glAllBuffers);
            gl.viewport(0, 0, groundFbo.width, groundFbo.height);

            program.loadDrawMode(gl, program.MODE_TEX_COPY_FADE);
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.bindTexture(gl.TEXTURE_2D, groundFbo.getSecondaryTexture());
            dc.frameStatistics.incrementTextureLoadCount(1);

            gl.drawArrays(gl.TRIANGLES, 0, 6);


            gl.bindBuffer(gl.ARRAY_BUFFER, particleVbo);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            program.loadDrawMode(gl, program.MODE_DRAW_PARTICLES);
            program.loadBbox(gl, bbox);
            gl.bindTexture(gl.TEXTURE_2D, colorsTexure);
            dc.frameStatistics.incrementTextureLoadCount(1);

            gl.drawArrays(gl.POINTS, 0, this._numParticles);

            groundFbo.swap();
            groundFbo.isCleared = false;


            /* Update particle sim */

            simFbo.bindFbo(dc);
            gl.clear(glAllBuffers);
            gl.viewport(0, 0, this._simTextureResolution, this._simTextureResolution);

            gl.disable(gl.BLEND);

            program = dc.findAndBindProgram(GridParticleSimProgram);

            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            program.loadGridDimensions(gl, this.gridData.width, this.gridData.height);
            program.loadGridMinMax(gl, this.gridData.uMin, this.gridData.vMin, this.gridData.uMax, this.gridData.vMax);
            program.loadRandSeed(gl, Math.random());
            program.loadSpeedFactor(gl, this.speedFactor);
            program.loadDropRate(gl, this.dropRate);
            program.loadDropRateMultiplier(gl, this.dropRateMultiplier);
            program.loadGridSampler(gl, gl.TEXTURE0);
            program.loadParticleSamper(gl, gl.TEXTURE1);
            program.loadBbox(gl, bbox);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            simFbo.swap();
            simFbo.isCleared = false;
        };

        /**
         * Restores the WebGL state after rendering to an offsreeen framebuffer.
         * @param {DrawContext} dc
         */
        GriddedDataLayer.prototype.restoreGLState = function (dc) {
            var gl = dc.currentGlContext;

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, dc.viewport.width, dc.viewport.height);

            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.activeTexture(gl.TEXTURE0);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        };

        /**
         * Clears the ground fbo's textures.
         * @param {DrawContext} dc
         */
        GriddedDataLayer.prototype.clearGroundFbo = function (dc) {
            this._requiresFboClear = false;

            var groundKey = this._groundTextureKey;
            if (dc.globe.offset === 1) {
                groundKey = this._groundTextureKey1;
            }
            else if (dc.globe.offset === -1) {
                groundKey = this._groundTextureKey2;
            }

            var fbo = dc.gpuResourceCache.resourceForKey(groundKey);

            if (fbo && !fbo.isCleared) {
                fbo.clearFbo(dc);
                var gl = dc.currentGlContext;
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, dc.viewport.width, dc.viewport.height);
                this._lastGroundFboClear = Date.now();
            }
        };

        /**
         * Binds the teture of the offscreen framebuffer to be drawn on the terrain.
         * @param {DrawContext} dc
         */
        GriddedDataLayer.prototype.bind = function (dc) {
            var groundKey = this._groundTextureKey;
            if (dc.globe.offset === 1) {
                groundKey = this._groundTextureKey1;
            }
            else if (dc.globe.offset === -1) {
                groundKey = this._groundTextureKey2;
            }

            var fbo = dc.gpuResourceCache.resourceForKey(groundKey);

            if (!fbo) {
                return false;
            }

            return fbo.bind(dc);
        };

        // Intentionally not documented.
        GriddedDataLayer.prototype.applyInternalTransform = function (dc, matrix) {

        };

        /**
         * Loads the grid json data from the specified url.
         * @param {String} url
         */
        GriddedDataLayer.prototype.loadGridData = function (url) {
            if (this._loadInProgress) {
                return;
            }

            if (!url) {
                return;
            }

            var self = this;
            var xhr = new XMLHttpRequest();

            xhr.onload = function () {
                self._loadInProgress = false;

                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                    var gribData = JSON.parse(xhr.response);
                    self.gridData = self.createGridData(gribData);
                }
                else {
                    throw new Error(xhr.statusText);
                }
            };

            xhr.onerror = function () {
                self._loadInProgress = false;
                throw new Error('Unable to fetch data: ' + url);
            };

            xhr.open('GET', url, true);

            xhr.send();

            this._loadInProgress = true;
        };

        /**
         * Transforms the gribData as outputed by the grib2json library to a format suitable for rendering in an offsreen framebuffer
         * @param {Object} gribData The grib data as outputed by the grib2json library
         * @return {Object} The grid data needed for rendering in an offsreen framebuffer
         */
        GriddedDataLayer.prototype.createGridData = function (gribData) {
            var u = gribData[0];
            var v = gribData[1];

            var width = Math.floor(u.header.nx);
            var height = Math.floor(u.header.ny);

            var uMin = u.data[0];
            var uMax = u.data[0];
            var vMin = v.data[0];
            var vMax = v.data[0];
            for (var i = 1, len = u.data.length; i < len; i++) {
                if (uMin > u.data[i]) {
                    uMin = u.data[i];
                }
                if (uMax < u.data[i]) {
                    uMax = u.data[i];
                }
                if (vMin > v.data[i]) {
                    vMin = v.data[i];
                }
                if (vMax < v.data[i]) {
                    vMax = v.data[i];
                }
            }

            var arr = new Uint8Array(width * height * 4);
            var deltaU = uMax - uMin;
            var delatV = vMax - vMin;
            var haflWidth = Math.floor(width / 2);
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    i = (y * width + x) * 4;
                    var k = y * width + (x + haflWidth) % width;
                    arr[i + 0] = Math.floor(255 * (u.data[k] - uMin) / deltaU);
                    arr[i + 1] = Math.floor(255 * (v.data[k] - vMin) / delatV);
                    arr[i + 2] = 0;
                    arr[i + 3] = 255;
                }
            }

            var gridData = {
                width: width,
                height: height,
                uMin: uMin,
                uMax: uMax,
                vMin: vMin,
                vMax: vMax,
                data: arr
            };

            return gridData;
        };

        /**
         * Computes the bounding sector for a list of tiles and saves the result in the provides sector. 
         * @param {Array} tiles The list of tiles
         * @param {Sector} sector The sector in which to save the result
         * @return {Sector} The bounding sector
         */
        GriddedDataLayer.prototype.getBoundingSector = function (tiles, sector) {
            if (tiles.length) {
                sector.copy(tiles[0].sector);
            }

            for (var i = 1, len = tiles.length; i < len; i++) {
                sector.union(tiles[i].sector);
            }

            return sector;
        };

        /**
         * Computes a normalized bounding box for the given sector and saves the result in the provides bbox.
         * The x axis coresponds with longitude, 0 coresponds with -180 and 1 coresponds with 180.
         * The y axis coresponds with latitude, 0 coresponds with 90 and 1 coresponds with -90.
         * @param {Sector} sector The sector for which to compute the bounding box
         * @param {Float32Array} bbox An array in which to store the result. The format is: [xMin, yMin, xMax, yMax]
         * @return {Array} The provided bbox
         */
        GriddedDataLayer.prototype.getBoundingBox = function (sector, bbox) {
            bbox[0] = (sector.minLongitude + 180) / 360;
            bbox[1] = (sector.maxLatitude - 90) / -180;
            bbox[2] = (sector.maxLongitude + 180) / 360;
            bbox[3] = (sector.minLatitude - 90) / -180;

            return bbox;
        };

        /**
         * Removes tiles that are behind the horizon.
         * 
         * The eyeAltitudeReduction parameter of this layer can be used to futher cull tiles that are on the edge of the globe and barely visible.
         * Setting the eyeAltitudeReduction to 0 will not cull tiles that are visible.
         * 
         * The eyeAltitudeReductionTrehshold parameter of this layer controlls if a reduction should apply.
         * When the altitude is very high, tiles that are perfectly visible might get culled. 
         * 
         * @param {DrawContext} dc
         * @param {Array} tiles
         * @return {Array} The tiles that are visible.
         */
        GriddedDataLayer.prototype.cullTilesHorizon = function (dc, tiles) {
            var newTiles = [];
            var altitude = dc.eyePosition.altitude;
            var altitudeMultiplier = 1 - this.eyeAltitudeReduction;
            if (altitude > this.eyeAltitudeReductionTrehshold) {
                altitudeMultiplier = 1;
            }
            var horizonDistance = WWMath.horizonDistanceForGlobeRadius(dc.globe.equatorialRadius, altitude * altitudeMultiplier);

            for (var i = 0, len = tiles.length; i < len; i++) {
                var tile = tiles[i];
                var distance = tile.distanceTo(dc.eyePoint);
                if (distance <= horizonDistance) {
                    newTiles.push(tile);
                }
            }

            return newTiles;
        };

        // Documented in superclass.
        GriddedDataLayer.prototype.retrieveTileImage = function (dc, tile, suppressRedraw) {
            this.currentTilesInvalid = true;

            if (!suppressRedraw) {
                // Send an event to request a redraw.
                var e = document.createEvent('Event');
                e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                window.dispatchEvent(e);
            }
        };

        // Documented in superclass.
        GriddedDataLayer.prototype.addTile = function (dc, tile) {
            tile.fallbackTile = null;
            tile.opacity = 1;
            this.currentTiles.push(tile);
        };

        /**
         * Creates a DoubleBufferedFbo for the particle simulation.
         * 
         * @param {DrawContext} dc
         * @param {String} key The gpuCache key
         * @return {DoubleBufferedFbo}
         */
        GriddedDataLayer.prototype.createSimFbo = function (dc, key) {
            this._simTextureResolution = Math.ceil(Math.sqrt(this._numParticles));
            this._numParticles = this._simTextureResolution * this._simTextureResolution;

            var particles = new Uint8Array(this._numParticles * 4);
            for (var i = 0, len = particles.length; i < len; i++) {
                particles[i] = Math.floor(Math.random() * 256);
            }

            var options = { width: this._simTextureResolution, height: this._simTextureResolution };
            var texture1 = this.createTexture(dc, particles, options);
            var texture2 = this.createTexture(dc, particles, options);

            var simFbo = new DoubleBufferedFbo(dc, texture1, texture2, options.width, options.height);
            dc.gpuResourceCache.putResource(key, simFbo, simFbo.size);

            return simFbo;
        };

        /**
         * Creates a DoubleBufferedFbo for the particle ground texture.
         * 
         * @param {DrawContext} dc
         * @param {String} key The gpuCache key
         * @return {DoubleBufferedFbo}
         */
        GriddedDataLayer.prototype.createGroundFbo = function (dc, key) {
            var gl = dc.currentGlContext;

            var options = { width: this._groundTextureResolution, height: this._groundTextureResolution };
            options[gl.TEXTURE_MIN_FILTER] = gl.NEAREST;
            options[gl.TEXTURE_MAG_FILTER] = gl.NEAREST;

            var pixels = new Uint8Array(options.width * options.height * 4);

            var texture1 = this.createTexture(dc, pixels, options);
            var texture2 = this.createTexture(dc, pixels, options);

            var groundFbo = new DoubleBufferedFbo(dc, texture1, texture2, options.width, options.height);
            dc.gpuResourceCache.putResource(key, groundFbo, groundFbo.size);

            return groundFbo;
        };

        /**
         * Creates a WebGLTexture for the color gradient.
         * 
         * @param {DrawContext} dc
         * @param {String} key The gpuCache key
         * @return {WebGLTexture}
         */
        GriddedDataLayer.prototype.createColorsTexture = function (dc, key) {
            var gl = dc.currentGlContext;

            var pixles = this.createColorGradient(this._colors);

            var options = { width: 16, height: 16 };
            options[gl.TEXTURE_MIN_FILTER] = gl.LINEAR;
            options[gl.TEXTURE_MAG_FILTER] = gl.LINEAR;

            var texture = this.createTexture(dc, pixles, options);
            var size = options.width * options.height * 4;
            dc.gpuResourceCache.putResource(key, texture, size);

            return texture;
        };

        /**
         * Creates a WebGLTexture for the grib data.
         * 
         * @param {DrawContext} dc
         * @param {String} key The gpuCache key
         * @return {WebGLTexture}
         */
        GriddedDataLayer.prototype.createGridTexture = function (dc, key) {
            var gl = dc.currentGlContext;

            var pixles = this.gridData.data;

            var options = { width: this.gridData.width, height: this.gridData.height };
            options[gl.TEXTURE_MIN_FILTER] = gl.LINEAR;
            options[gl.TEXTURE_MAG_FILTER] = gl.LINEAR;

            var texture = this.createTexture(dc, pixles, options);
            var size = options.width * options.height * 4;
            dc.gpuResourceCache.putResource(key, texture, size);

            return texture;
        };

        /**
         * Creates a WebGLBuffer for the particles.
         * 
         * @param {DrawContext} dc
         * @param {String} key The gpuCache key
         * @return {WebGLBuffer}
         */
        GriddedDataLayer.prototype.createParticleVbo = function (dc) {
            var gl = dc.currentGlContext;

            var len = this._numParticles * 2;
            var particles = new Float32Array(len);
            var idx = 0;
            for (var i = 0; i < len; i += 2) {
                particles[i] = idx++;
            }

            var vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);
            dc.gpuResourceCache.putResource(this._particleVboKey, vbo, particles.byteLength);

            return vbo;
        };

        /**
         * Creates a WebGLBuffer for a quad.
         * 
         * @param {DrawContext} dc
         * @param {String} key The gpuCache key
         * @return {WebGLBuffer}
         */
        GriddedDataLayer.prototype.createQuadVbo = function (dc) {
            var gl = dc.currentGlContext;

            var data = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

            var vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            dc.gpuResourceCache.putResource(this._quadVboKey, vbo, data.byteLength);

            return vbo;
        };

        /**
         * Creates a WebGLTexture for a given typed array and options.
         * 
         * @param {DrawContext} dc
         * @param {Unit8Array} data A typped array, ussually a Unit8Array
         * @param {Object} options Options for the width, height, wrap, min and max filters. Width and height are mandatory.
         * @return {WebGLTexture}
         */
        GriddedDataLayer.prototype.createTexture = function (dc, data, options) {
            var gl = dc.currentGlContext;
            var texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options[gl.TEXTURE_WRAP_S] || gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options[gl.TEXTURE_WRAP_T] || gl.CLAMP_TO_EDGE);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options[gl.TEXTURE_MIN_FILTER] || gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options[gl.TEXTURE_MAG_FILTER] || gl.NEAREST);

            var level = options.level || 0;
            var format = options.format || gl.RGBA;
            var type = options.type || gl.UNSIGNED_BYTE;
            var width = options.width;
            var height = options.height;
            var border = 0;
            gl.texImage2D(gl.TEXTURE_2D, level, format, width, height, border, format, type, data);

            return texture;
        };

        /**
         * Creates a color gradient for the given colors.
         *
         * @param {Object} colors An object with the keys as numbers between 0 - 1 and the values as a valid css color string.
         * @return {Uint8ClampedArray}
         */
        GriddedDataLayer.prototype.createColorGradient = function (colors) {
            var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 1;
            var ctx = canvas.getContext('2d');

            var gradient = ctx.createLinearGradient(0, 0, 256, 0);

            var stops = Object.keys(colors);
            for (var i = 0, len = stops.length; i < len; i++) {
                var stop = stops[i];
                gradient.addColorStop(Number(stop), colors[stop]);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 1);

            return ctx.getImageData(0, 0, 256, 1).data;
        };

        return GriddedDataLayer;
    });