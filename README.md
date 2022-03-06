# Weather Data Backend Microservice
## Map projections
[geoJSONs Used.](https://github.com/nmota/caop_GeoJSON)

The Portugal geoJSONs that were available to me had two different Coordinates Reference System (CRS).

- The geoJSONs located in the root folder use the EPSG Projection 3763, that need proj4 to be successfully projected to the map.
- The geoJSONs in the "geograficas" folder use the EPSG Projection 4258, that can be projected without proj4.
  
### 1st Implementation

With this in mind, if the geoJSON sent by the server uses the EPSG Projection 3763, the frontend uses proj4 to project this coordinates system to the map.

If the server sends any other projection system, proj4 isn't used, and the geoJSON is simply projected to the map using the default function.


## 2nd Implementation

The frontend identifies the projection system number that was sent by the backend, and requests the corresponding projection system information from an external API, so the coordinates can be correctly projected to the map.