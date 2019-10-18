define([
        '../geom/Location',
        '../geom/Sector',
        '../layer/WmsLayer'
    ],
    function (Location,
              Sector,
              WmsLayer) {
        "use strict";

        /**
         * Constructs a Sentinel Cloudless layer.
         * @alias SentinelCloudlessLayer
         * @constructor
         * @augments WmsLayer
         * @classdesc Displays a Sentinel Cloudless layer that spans the entire globe.
         */
        var SentinelCloudlessLayer = function () {
            WmsLayer.call(
                this,
                {
                    service: "https://tiles.maps.eox.at/wms",
                    layerNames: "s2cloudless-2018",
                    title: "Sentinel Cloudless Layer",
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

        SentinelCloudlessLayer.prototype = Object.create(WmsLayer.prototype);

        return SentinelCloudlessLayer;
    });
