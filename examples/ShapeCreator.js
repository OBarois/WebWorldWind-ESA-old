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
 * Illustrates how to use ShapeEditor - create method.
 *
 */
requirejs(['./WorldWindShim',
        './LayerManager'],
    function (ww,
              LayerManager) {
        "use strict";

        // Tell World Wind to log only warnings.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the World Window.
        var wwd = new WorldWind.WorldWindow("canvasOne");

        /**
         * Added imagery layers.
         */
        var layers = [
            {layer: new WorldWind.SentinelCloudlessLayer(), enabled: true},
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        // Create a layer to hold the surface shapes.
        var shapesLayer = new WorldWind.RenderableLayer("Surface Shapes");
        wwd.addLayer(shapesLayer);

        // Create and set attributes for future created shapes.
        var attributes = new WorldWind.ShapeAttributes(null);
        attributes.outlineColor = WorldWind.Color.BLACK;
        attributes.interiorColor = new WorldWind.Color(0.8, 0.9, 0.9, 1.0);

        var highlightAttributes = new WorldWind.ShapeAttributes(attributes);
        highlightAttributes.outlineColor = WorldWind.Color.RED;
        highlightAttributes.outlineWidth = 5;

        wwd.goTo(new WorldWind.Position(40.42, -104.60, 2417000));

        // Create a layer manager for controlling layer visibility.
        new LayerManager(wwd);

        var shapeEditor = new WorldWind.ShapeEditor(wwd);

        var config = {
            move: true,
            reshape: true,
            rotate: true,
            manageControlPoint: true
        };

        var selectedShape = null;
        var lastAction = null;
        var creatorEnabled = true;

        // The common pick-handling function.
        var handlePick = function (o) {
            // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
            // the mouse or tap location.
            var x = o.clientX,
                y = o.clientY;

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));

            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    // Enable editor if a shape is picked.
                    if (!pickList.objects[p].isTerrain && !creatorEnabled) {
                        var pickedShape = pickList.objects[p].userObject;

                        if (selectedShape !== pickedShape && !pickedShape.userProperties.purpose) {
                            if (pickedShape instanceof WorldWind.SurfaceCircle) {
                                selectedShape = pickedShape;
                            }

                            shapeEditor.stop();
                            $("#creator").removeAttr('checked');
                            creatorEnabled = false;
                            shapeEditor.edit(selectedShape, config);
                        }

                        lastAction = pickedShape.userProperties.purpose;
                    } else if (pickList.objects[p].isTerrain && pickList.objects[p].isOnTop && lastAction !== "location" && !creatorEnabled) {
                        shapeEditor.stop();
                        $("#creator").removeAttr('checked');
                        creatorEnabled = false;
                        selectedShape = null;
                        lastAction = null;
                    } else if (pickList.objects[p].isTerrain && pickList.objects[p].isOnTop && creatorEnabled && lastAction == null) {
                        $('#creator').click();
                    }
                }
            }
        };

        wwd.addEventListener("click", handlePick);

        document.getElementById("creator").addEventListener("click", function(){
            var properties = {
                center: null,
                radius: 200e3,
                attributes: attributes
            };

            shapeEditor.create(WorldWind.SurfaceCircle, properties).then(
                function (shape) {
                    if (shape !== null) {
                        shape.highlightAttributes = highlightAttributes;
                        shapesLayer.addRenderable(shape);
                        shapeEditor.edit(shape, config);
                    } else {
                        console.log("No shape created - null shape returned.");
                    }

                },
                function (error) {
                    if (error) {
                        console.log("Error in shape creation: " + error);
                    } else {
                        console.log("No shape created.");
                    }
                }
            );

            creatorEnabled = false;
        });

        $('#creator').click();
    }
);
