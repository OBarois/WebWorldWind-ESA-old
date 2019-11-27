define([
        '../geom/Location',
        '../geom/Sector',
        '../layer/WmsLayer',
        '../util/Color'
    ],
    function (Location,
              Sector,
              WmsLayer,
              Color) {
        "use strict";

        /**
         * Constructs a Sentinel-2 Cloudless layer.
         * @alias Sentinel2CloudlessLayer
         * @constructor
         * @augments WmsLayer
         * @classdesc Displays a Sentinel-2 Cloudless layer that spans the entire globe.
         */
        var Sentinel2CloudlessLayer = function () {
            WmsLayer.call(
                this,
                {
                    service: "https://tiles.maps.eox.at/wms",
                    layerNames: "s2cloudless-2018",
                    title: "Sentinel-2 Cloudless Layer",
                    sector: Sector.FULL_SPHERE,
                    levelZeroDelta: new Location(45, 45),
                    numLevels: 7,
                    format: "image/jpeg",
                    opacity: 1,
                    size: 256,
                    version: "1.3.0"
                },
                null
            );
        };

        Sentinel2CloudlessLayer.prototype = Object.create(WmsLayer.prototype);

        Sentinel2CloudlessLayer.prototype.doRender = function (dc) {
            WmsLayer.prototype.doRender.call(this, dc);
            if (this.inCurrentFrame) {
                dc.screenCreditController.addCredit("Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2017 & 2018)", Color.DARK_GRAY);
            }
        };

        return Sentinel2CloudlessLayer;
    });
