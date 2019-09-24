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
 * Illustrates how to load and display GeoJSON data.
 */

requirejs(['./WorldWindShim',
        './LayerManager'],
    function (WorldWind,
              LayerManager) {
        "use strict";

        // Tell WorldWind to log only warnings and errors.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the WorldWindow.
        var wwd = new WorldWind.WorldWindow("canvasOne");

        // Create and add layers to the WorldWindow.
        var layers = [
            // Imagery layers.
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            // Add atmosphere layer on top of base layer.
            {layer: new WorldWind.AtmosphereLayer(), enabled: true},
            // WorldWindow UI layers.
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        // Set up the common placemark attributes.
        var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        placemarkAttributes.imageScale = 0.05;
        placemarkAttributes.imageColor = WorldWind.Color.WHITE;
        placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 1.5);
        placemarkAttributes.imageSource = "data:image/png;base64,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";

        var shapeConfigurationCallback = function (geometry, properties) {
            var configuration = {};

            if (properties && (properties.name || properties.Name || properties.NAME)) {
                configuration.name = properties.name || properties.Name || properties.NAME;
            }

            if (geometry.isPointType() || geometry.isMultiPointType()) {
                configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);

                if (properties && properties.POP_MAX) {
                    var population = properties.POP_MAX;
                    configuration.attributes.imageScale = 0.01 * Math.log(population);
                }
            }
            else if (geometry.isLineStringType() || geometry.isMultiLineStringType()) {
                configuration.attributes = new WorldWind.ShapeAttributes(null);
                configuration.attributes.drawOutline = true;
                configuration.attributes.outlineColor = new WorldWind.Color(
                    0.1 * configuration.attributes.interiorColor.red,
                    0.3 * configuration.attributes.interiorColor.green,
                    0.7 * configuration.attributes.interiorColor.blue,
                    1.0);
                configuration.attributes.outlineWidth = 2.0;
            }
            else if (geometry.isPolygonType() || geometry.isMultiPolygonType()) {
                configuration.attributes = new WorldWind.ShapeAttributes(null);

                // Fill the polygon with a random pastel color.
                configuration.attributes.interiorColor = new WorldWind.Color(
                    0.375 + 0.5 * Math.random(),
                    0.375 + 0.5 * Math.random(),
                    0.375 + 0.5 * Math.random(),
                    0.5);
                // Paint the outline in a darker variant of the interior color.
                configuration.attributes.outlineColor = new WorldWind.Color(
                    0.5 * configuration.attributes.interiorColor.red,
                    0.5 * configuration.attributes.interiorColor.green,
                    0.5 * configuration.attributes.interiorColor.blue,
                    1.0);
            }

            return configuration;
        };

        var parserCompletionCallback = function (layer) {
            wwd.addLayer(layer);
            layerManager.synchronizeLayerList();
        };

        var resourcesUrl = "https://worldwind.arc.nasa.gov/web/examples/data/geojson-data/";

        // Polygon test
        var polygonLayer = new WorldWind.RenderableLayer("Polygon - Romania");
        var polygonGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "PolygonTest.geojson");
        polygonGeoJSON.load(null, shapeConfigurationCallback, polygonLayer);
        wwd.addLayer(polygonLayer);

        // MultiPolygon test
        var multiPolygonLayer = new WorldWind.RenderableLayer("MultiPolygon - Italy");
        var multiPolygonGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "MultiPolygonTest.geojson");
        multiPolygonGeoJSON.load(null, shapeConfigurationCallback, multiPolygonLayer);
        wwd.addLayer(multiPolygonLayer);

        //Point test
        var pointLayer = new WorldWind.RenderableLayer("Point - Bucharest");
        var pointGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "PointTest.geojson");
        pointGeoJSON.load(null, shapeConfigurationCallback, pointLayer);
        wwd.addLayer(pointLayer);

        //MultiPoint test
        var multiPointLayer = new WorldWind.RenderableLayer("MultiPoint - Italy");
        var multiPointGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "MultiPointTest.geojson");
        multiPointGeoJSON.load(null, shapeConfigurationCallback, multiPointLayer);
        wwd.addLayer(multiPointLayer);

        //LineString test
        var lineStringLayer = new WorldWind.RenderableLayer("LineString - Cluj - Bologna");
        var lineStringDataSource = '{ "type": "LineString", "coordinates": [[23.62364, 46.77121] , [ 11.34262, 44.49489]] }';
        var lineStringGeoJSON = new WorldWind.GeoJSONParser(lineStringDataSource);
        lineStringGeoJSON.load(null, shapeConfigurationCallback, lineStringLayer);
        wwd.addLayer(lineStringLayer);

        //MultiLineString test
        var multiLineStringLayer = new WorldWind.RenderableLayer("MultiLineString - Danube");
        var multiLineStringGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "MultiLineStringTest.geojson");
        multiLineStringGeoJSON.load(null, shapeConfigurationCallback, multiLineStringLayer);
        wwd.addLayer(multiLineStringLayer);

        // GeometryCollection test with a callback function
        var geometryCollectionLayer = new WorldWind.RenderableLayer("GeometryCollection - Greece");
        var geometryCollectionGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "GeometryCollectionFeatureTest.geojson");
        geometryCollectionGeoJSON.load(parserCompletionCallback, shapeConfigurationCallback, geometryCollectionLayer);

        // Feature test
        var featureLayer = new WorldWind.RenderableLayer("Feature - Germany");
        var featureGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "FeatureTest.geojson");
        featureGeoJSON.load(null, shapeConfigurationCallback, featureLayer);
        wwd.addLayer(featureLayer);

        // Feature collection test

        // Feature collection - Spain and Portugal
        var spainLayer = new WorldWind.RenderableLayer("Feature Collection - Spain & Portugal");
        var spainGeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "FeatureCollectionTest_Spain_Portugal.geojson");
        spainGeoJSON.load(null, shapeConfigurationCallback, spainLayer);
        wwd.addLayer(spainLayer);

        //CRS Reprojection test

        //USA EPSG:3857 named
        var ch3857Layer = new WorldWind.RenderableLayer("Switzerland 3857");
        var ch3857GeoJSON = new WorldWind.GeoJSONParser(resourcesUrl + "FeatureCollectionTest_EPSG3857_Switzerland.geojson");
        ch3857GeoJSON.load(null, shapeConfigurationCallback, ch3857Layer);
        wwd.addLayer(ch3857Layer);

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);
        layerManager.synchronizeLayerList();
        layerManager.goToAnimator.goTo(new WorldWind.Location(38.72, 14.91))
    });