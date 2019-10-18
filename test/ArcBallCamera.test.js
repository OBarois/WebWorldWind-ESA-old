/*
 * Copyright 2003-2006, 2009, 2017, 218, 2019, United States Government, as represented by the Administrator of the
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

        describe('ArcBallCamera tests', function () {

            var wwd = {
                globe: new Globe({}, new ProjectionWgs84())
            };

            describe('Apply limits', function () {
                it ('Applies limits', function () {
                    var camera = new ArcBallCamera(wwd);
                    
                    camera.position.latitude = 100;
                    camera.position.longitude = 185;
                    camera.position.altitude = -1000;
                    camera.heading = 370;
                    camera.tilt = 100;
                    camera.range = -6000;
                    camera.roll = -270;
                    
                    camera.applyLimits();

                    expect(camera.position.latitude).toEqual(90);
                    expect(camera.position.longitude).toEqual(-175);
                    expect(camera.position.altitude).toEqual(0);
                    expect(camera.heading).toEqual(10);
                    expect(camera.tilt).toEqual(90);
                    expect(camera.range).toEqual(1);
                    expect(camera.roll).toEqual(90);
                })
            });

            describe('Compute view matrix', function () {
                it('Computes a view matrix at position (45, -100, 0), heading = 50, tilt = 70, range = 6000000, roll = 45', function () {
                    var camera = new ArcBallCamera(wwd);

                    camera.position.latitude = 45;
                    camera.position.longitude = -100;
                    camera.position.altitude = 1000000;
                    camera.heading = 50;
                    camera.tilt = 70;
                    camera.range = 6000000;
                    camera.roll = 45;

                    var viewMatrix = Matrix.fromIdentity();
                    camera.createViewMatrix(viewMatrix);

                    var expectedViewMatrix = new Matrix(
                        -0.842667172743828, 0.19708589624155126, 0.5010680447629725, -4904949.8347275825, 
                        0.06993611085767854, 0.9627810573740324, -0.2610777201521467, -4878144.36793613, 
                        -0.5338735584181202, -0.18495887398123026, -0.8250874126767231, -8534759.35832617, 
                        0, 0, 0, 1
                    );
                   
                    for (var i = 0; i < 16; i++) {
                        expect(viewMatrix[i]).toBeCloseTo(expectedViewMatrix[i]);
                    }
                });

                it('Computes a view matrix at position (0, 0, 0), heading = 0, tilt = 0, range = 10e6, roll = 0', function () {
                    var camera = new ArcBallCamera(wwd);

                    camera.position.latitude = 0;
                    camera.position.longitude = 0;
                    camera.position.altitude = 0;
                    camera.heading = 0;
                    camera.tilt = 0;
                    camera.range = 10e6;
                    camera.roll = 0;

                    var viewMatrix = Matrix.fromIdentity();
                    camera.createViewMatrix(viewMatrix);
                    
                    var expectedViewMatrix = new Matrix(
                        1, 0, 0, 0, 
                        0, 1, 0, 0, 
                        0, 0, 1, -wwd.globe.equatorialRadius - camera.range,
                        0, 0, 0, 1
                    );
                    
                    for (var i = 0; i < 16; i++) {
                        expect(viewMatrix[i]).toBeCloseTo(expectedViewMatrix[i]);
                    }
                });
            });

            describe('Convert to FirstPersonCamera', function () {
                it('Converts to a FirstPersonCamera at position (45, -100, 1000000), heading = 50, tilt = 70, range = 6000000, roll = 45', function () {
                    var camera = new ArcBallCamera(wwd);

                    camera.position.latitude = 45;
                    camera.position.longitude = -100;
                    camera.position.altitude = 1000000;
                    camera.heading = 50;
                    camera.tilt = 70;
                    camera.range = 6000000;
                    camera.roll = 45;

                    var firstPersonCamera = new FirstPersonCamera(wwd);
                    camera.toFirstPerson(firstPersonCamera);
    
                    expect(firstPersonCamera.position.latitude).toBeCloseTo(21.9, 0);
                    expect(firstPersonCamera.position.longitude).toBeCloseTo(-125.05, 0);
                    expect(firstPersonCamera.position.altitude).toBeCloseTo(4611040.83, 0);
                    expect(firstPersonCamera.heading).toBeCloseTo(35.72, 0);
                    expect(firstPersonCamera.tilt).toBeCloseTo(-50.86, 0);
                    expect(firstPersonCamera.roll).toBeCloseTo(45);
                });

                it('Converts to a FirstPersonCamera at position (0, 0, 0), heading = 0, tilt = 0, range = 10e6, roll = 0', function () {
                    var camera = new ArcBallCamera(wwd);

                    camera.position.latitude = 0;
                    camera.position.longitude = 0;
                    camera.position.altitude = 0;
                    camera.heading = 0;
                    camera.tilt = 0;
                    camera.range = 10e6;
                    camera.roll = 0;

                    var firstPersonCamera = new FirstPersonCamera(wwd);
                    camera.toFirstPerson(firstPersonCamera);

                    expect(firstPersonCamera.position.latitude).toBeCloseTo(0, 0);
                    expect(firstPersonCamera.position.longitude).toBeCloseTo(0, 0);
                    expect(firstPersonCamera.position.altitude).toBeCloseTo(camera.range, 0);
                    expect(firstPersonCamera.heading).toBeCloseTo(0);
                    expect(firstPersonCamera.tilt).toBeCloseTo(-90);
                    expect(firstPersonCamera.roll).toBeCloseTo(0);
                });
            });

        });
    });