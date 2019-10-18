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
define([
    'src/ArcBallCamera',
    'src/FirstPersonCamera',
    'src/globe/Globe',
    'src/geom/Matrix',
    'src/projections/ProjectionWgs84',
    'src/WorldWind'
],
    function (ArcBallCamera, FirstPersonCamera, Globe, Matrix, ProjectionWgs84, WorldWind) {
        'use strict';

        describe('FirstPersonCamera tests', function () {

            var wwd = {
                globe: new Globe({}, new ProjectionWgs84())
            };

            describe('Apply limits', function () {
                it ('Applies limits', function () {
                    var camera = new FirstPersonCamera(wwd);
                    
                    camera.position.latitude = 100;
                    camera.position.longitude = 185;
                    camera.position.altitude = -1000;
                    camera.heading = 370;
                    camera.tilt = 100;
                    camera.roll = -270;
                    
                    camera.applyLimits();

                    expect(camera.position.latitude).toEqual(90);
                    expect(camera.position.longitude).toEqual(-175);
                    expect(camera.position.altitude).toEqual(0);
                    expect(camera.heading).toEqual(10);
                    expect(camera.tilt).toEqual(90);
                    expect(camera.roll).toEqual(90);
                });
            });

            describe('Compute view matrix', function () {
                it('Computes a view matrix at position (30, -110, 75000), heading = 60, tilt = -25, roll = 45', function () {
                    var camera = new FirstPersonCamera(wwd);

                    camera.position.latitude = 30;
                    camera.position.longitude = -110;
                    camera.position.altitude = 75000;
                    camera.heading = 60;
                    camera.tilt = -25;
                    camera.roll = 45;

                    var viewMatrix = Matrix.fromIdentity();
                    camera.createViewMatrix(viewMatrix);

                    var expectedViewMatrix = new Matrix(
                        -0.9484844955630164, -0.08047535531368649, 0.3064325029491915, -4140779.5323317777, 
                        -0.1311640979110773, 0.9801640635625537, -0.14857451975259928, -4117849.086579813, 
                        -0.2883975400306731, -0.18111357124102578, -0.9402258947809183, -2733440.9615109023, 
                        0, 0, 0, 1
                    );
                    
                    for (var i = 0; i < 16; i++) {
                        expect(viewMatrix[i]).toBeCloseTo(expectedViewMatrix[i]);
                    }
                });

                it('Computes a view matrix at position (0, 0, 10e6), heading = 0, tilt = -90, roll = 0', function () {
                    var camera = new FirstPersonCamera(wwd);

                    camera.position.latitude = 0;
                    camera.position.longitude = 0;
                    camera.position.altitude = 0;
                    camera.heading = 0;
                    camera.tilt = -90;
                    camera.roll = 0;

                    var viewMatrix = Matrix.fromIdentity();
                    camera.createViewMatrix(viewMatrix);
                    
                    var expectedViewMatrix = new Matrix(
                        1, 0, 0, 0, 
                        0, 1, 0, 0, 
                        0, 0, 1, -wwd.globe.equatorialRadius, 
                        0, 0, 0, 1
                    );
                    
                    for (var i = 0; i < 16; i++) {
                        expect(viewMatrix[i]).toBeCloseTo(expectedViewMatrix[i]);
                    }
                });
            });

            describe('Convert to FirstPersonCamera', function () {
                it('Converts to a FirstPersonCamera at position (30, -110, 75000), heading = 60, tilt = -25, roll = 45', function () {
                    var camera = new FirstPersonCamera(wwd);

                    camera.position.latitude = 30;
                    camera.position.longitude = -110;
                    camera.position.altitude = 75000;
                    camera.heading = 60;
                    camera.tilt = -25;
                    camera.roll = 45;

                    var arcBallCamera = new ArcBallCamera(wwd);
                    var range = 182537.97902917932;
                    arcBallCamera.range = range;
                    camera.toArcBall(arcBallCamera);
    
                    expect(arcBallCamera.position.latitude).toBeCloseTo(30.73, 0);
                    expect(arcBallCamera.position.longitude).toBeCloseTo(-108.5, 0);
                    expect(arcBallCamera.position.altitude).toBeCloseTo(0, 0);
                    expect(arcBallCamera.heading).toBeCloseTo(60.75, 0);
                    expect(arcBallCamera.tilt).toBeCloseTo(66.48, 0);
                    expect(arcBallCamera.range).toBeCloseTo(range, 0);
                    expect(arcBallCamera.roll).toBeCloseTo(45, 0);
                });

                it('Converts to a FirstPersonCamera at position (0, 0, 10e6), heading = 0, tilt = -90, roll = 0', function () {
                    var camera = new FirstPersonCamera(wwd);

                    camera.position.latitude = 0;
                    camera.position.longitude = 0;
                    camera.position.altitude = 10e6;
                    camera.heading = 0;
                    camera.tilt = -90;
                    camera.roll = 0;

                    var arcBallCamera = new ArcBallCamera(wwd);
                    var range = arcBallCamera.range;
                    camera.toArcBall(arcBallCamera);

                    expect(arcBallCamera.position.latitude).toBeCloseTo(0, 0);
                    expect(arcBallCamera.position.longitude).toBeCloseTo(0, 0);
                    expect(arcBallCamera.position.altitude).toBeCloseTo(0, 0);
                    expect(arcBallCamera.heading).toBeCloseTo(0, 0);
                    expect(arcBallCamera.tilt).toBeCloseTo(0, 0);
                    expect(arcBallCamera.range).toBeCloseTo(range);
                    expect(arcBallCamera.roll).toBeCloseTo(0, 0);
                });
            });

        });
    });