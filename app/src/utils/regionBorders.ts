// Takes a geoJSON, and returns another geoJSON with the MultiPolygon features separated into multiple features
// with a single Polygon each and the same properties of the MultiPolygon
import {GeoJSON} from "../interfaces/GeoJSON";
import {RegionBordersDocument} from "../interfaces/DatabaseCollections/RegionBordersDocument";
import {Feature} from "../interfaces/GeoJSON/Feature";

/**
 * Separates a geoJSON MultiPolygon features into multiple Polygon features, if it has any.
 * Each new polygon feature has the same {@link RegionBordersDocument.properties} as the original MultiPolygon feature.
 * @param  geoJSON - to separate MultiPolygon features.
 * @return separatedGeoJSON - geoJSON with the MultiPolygon features separated.
 */
export function separateMultiPolygons(geoJSON: GeoJSON) {

    let separatedGeoJSON: GeoJSON = {
        type: geoJSON.type,
        crs: geoJSON.crs,
        features: []
    };

    for (const currentFeature of geoJSON.features) {

        // If the feature is of the type Polygon, then simply append it to the separated geoJSON
        if (currentFeature.geometry.type === "Polygon") {
            separatedGeoJSON.features.push(currentFeature);
        }

        // If the feature is of the type MultiPolygon, every Polygon in the MultiPolygon needs to be separated into a new feature
        else if (currentFeature.geometry.type === "MultiPolygon") {

            for (const polygon of currentFeature.geometry.coordinates) {

                let tempFeature: Feature = {

                    type: currentFeature.type,
                    properties: currentFeature.properties,
                    geometry: {
                        type: "Polygon",
                        coordinates: polygon,
                    }

                }


                separatedGeoJSON.features.push(tempFeature);

            }

        }

    }

    return separatedGeoJSON;

}