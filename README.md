# Weather Data Backend Microservice
## Map projections
[geoJSONs Used.](https://github.com/nmota/caop_GeoJSON)
- The geoJSONs located in the root folder use the EPSG Projection 3763, that need proj4 to be successfully projected to the map.
- The geoJSONs in the "geograficas" folder use the EPSG Projection 4258, that can be projected without proj4.
  

The Portugal geoJSONs that were available to me had two different Coordinates Reference System (CRS).

With this in mind, if the geoJSON sent by the server uses the EPSG Projection 3763, the frontend uses proj4 to project this coordinates system to the map.

If the server sends any other projection system, proj4 isn't used, and the geoJSON is simply projected to the map using the default function.