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
 * Illustrates how to use ShapeEditor.
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
            {layer: new WorldWind.Sentinel2CloudlessLayer(), enabled: true},
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

        var attributes = new WorldWind.ShapeAttributes(null);
        attributes.outlineColor = WorldWind.Color.BLACK;
        attributes.interiorColor = new WorldWind.Color(0.8, 0.9, 0.9, 1.0);

        var polygonBoundaries1 = [],
            polygonBoundaries2 = [],
            polygonBoundaries3 = [],
            polygonBoundaries4 = [],
            polygonBoundaries5 = [];

        polygonBoundaries1.push(new WorldWind.Location(40, -120));
        polygonBoundaries1.push(new WorldWind.Location(40, -115));
        polygonBoundaries1.push(new WorldWind.Location(38, -115));
        polygonBoundaries1.push(new WorldWind.Location(38, -120));

        polygonBoundaries2.push(new WorldWind.Location(40, -113));
        polygonBoundaries2.push(new WorldWind.Location(40, -108));
        polygonBoundaries2.push(new WorldWind.Location(38, -108));
        polygonBoundaries2.push(new WorldWind.Location(38, -113));

        polygonBoundaries3.push(new WorldWind.Location(40, -106));
        polygonBoundaries3.push(new WorldWind.Location(40, -101));
        polygonBoundaries3.push(new WorldWind.Location(38, -101));
        polygonBoundaries3.push(new WorldWind.Location(38, -106));

        polygonBoundaries4.push(new WorldWind.Location(40, -99));
        polygonBoundaries4.push(new WorldWind.Location(40, -94));
        polygonBoundaries4.push(new WorldWind.Location(38, -94));
        polygonBoundaries4.push(new WorldWind.Location(38, -99));

        polygonBoundaries5.push(new WorldWind.Location(40, -92));
        polygonBoundaries5.push(new WorldWind.Location(40, -87));
        polygonBoundaries5.push(new WorldWind.Location(38, -87));
        polygonBoundaries5.push(new WorldWind.Location(38, -92));

        var polygonShape1 = new WorldWind.SurfacePolygon(polygonBoundaries1, attributes);
        polygonShape1.timeRange[0] = new Date(2019, 8, 1, 13, 0, 0);
        polygonShape1.timeRange[1] = new Date(2019, 8, 1, 14, 0, 0);
        var polygonShape2 = new WorldWind.SurfacePolygon(polygonBoundaries2, attributes);
        polygonShape2.timeRange[0] = new Date(2019, 8, 2, 13, 0, 0);
        polygonShape2.timeRange[1] = new Date(2019, 8, 2, 14, 0, 0);
        var polygonShape3 = new WorldWind.SurfacePolygon(polygonBoundaries3, attributes);
        polygonShape3.timeRange[0] = new Date(2019, 8, 3, 13, 0, 0);
        polygonShape3.timeRange[1] = new Date(2019, 8, 3, 14, 0, 0);
        var polygonShape4 = new WorldWind.SurfacePolygon(polygonBoundaries4, attributes);
        polygonShape4.timeRange[0] = new Date(2019, 8, 4, 13, 0, 0);
        polygonShape4.timeRange[1] = new Date(2019, 8, 4, 14, 0, 0);
        var polygonShape5 = new WorldWind.SurfacePolygon(polygonBoundaries5, attributes);
        polygonShape5.timeRange[0] = new Date(2019, 8, 5, 13, 0, 0);
        polygonShape5.timeRange[1] = new Date(2019, 8, 5, 14, 0, 0);

        shapesLayer.addRenderable(polygonShape1);
        shapesLayer.addRenderable(polygonShape2);
        shapesLayer.addRenderable(polygonShape3);
        shapesLayer.addRenderable(polygonShape4);
        shapesLayer.addRenderable(polygonShape5);

        wwd.goTo(new WorldWind.Position(40.42, -104.60, 3217000));

        $("#date-slider").slider({
            orientation: "horizontal",
            min: 1,
            max: 5,
            value: 1,
            slide: function (event, ui) {
                changeParamValues(ui.value);
            }
        });

        function getDateFormat(date){
            var mm = date.getMonth() + 1;
            var dd = date.getDate();

            return [date.getFullYear(),
                (mm>9 ? '' : '0') + mm,
                (dd>9 ? '' : '0') + dd
            ].join('/');
        }

        function changeParamValues(value) {
            shapesLayer.timeRange[0] = new Date(2019, 8, value, 0, 0, 0, 0);
            shapesLayer.timeRange[1] = new Date(2019, 8, value, 23, 59, 59, 999);
            $("#selected-date").val(getDateFormat(shapesLayer.timeRange[0]));
            wwd.redraw();
        }
        changeParamValues(1);

        // Create a layer manager for controlling layer visibility.
        new LayerManager(wwd);
    }
);
