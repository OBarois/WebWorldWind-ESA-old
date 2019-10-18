# Web WorldWind (ESA Custom Build)

This is a custom build of Web WorldWind, which includes features not yet part of an official release from the project.
It is intended primarily for ESA projects.

The main differences are:
- Reader for WKT
- Reader for AAIGrid data
- Exporter for WKT
- Exporter for GeoJSON
- HeatMap Layer
- New API for elevation data
- Support for embedded resources in KMZ
- Allow setting canvas element instead of ID
- Improved Collada rendering (faster and larger models supported)
- Intertial navigation effect on fling in the default WorldWindController
- Enhanced cartesian arithmetic
- Zoom to mouse position behaviour
- ArcBall (lookat) and FirstPerson (free) cameras
- Service and layer for OpenSearch for EO
- Creator and editor for surface shapes
- Sentinel-2 Cloudless layer from EOX IT Services GmbH, see https://s2maps.eu/
- Time-based visibility for renderables
- Rotation of the globe like a ball once off its axis
- Animated layer for gridded data
- Various improvements and bug fixes

If you are new to Web WorldWind, please start with the official release and documentation at https://worldwind.arc.nasa.gov/web/

## License

These modifications were created in the scope of the Frame Contract for Social Media and Mobile Applications Development for EO Ground Segment and Mission Operations, European Space Agency (ESA) Contract Number 4000112250.
They are released under Apache License 2.0 like the Web WorldWind itself.

Consortium: Solenix Deutschland GmbH (Prime Contractor), TERRASIGNA SRL, GISAT SRO, Progressive Systems SRL, Qualteh JR SRL.

**Web WorldWind itself is licensed as follows:**

Copyright 2003-2006, 2009, 2017, United States Government, as represented by the Administrator of the
National Aeronautics and Space Administration. All rights reserved.

The NASAWorldWind/WebWorldWind platform is licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
