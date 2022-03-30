// Takes a geoJSON, and returns another geoJSON with the MultiPolygon features separated into multiple features
// with a single Polygon each and the same properties of the MultiPolygon
import {GeoJSON} from "../interfaces/GeoJSON";
import {FeatureDocument} from "../interfaces/DatabaseCollections/FeatureDocument";
import {Feature} from "../interfaces/GeoJSON/Feature";
import proj4 from "proj4";
import {CoordinatesReferenceSystem} from "../interfaces/GeoJSON/CoordinatesReferenceSystem";
import {FeatureGeometryMultiPolygon} from "../interfaces/GeoJSON/Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureGeometryPolygon} from "../interfaces/GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";
import {CRSAnyProperties} from "../interfaces/GeoJSON/CoordinatesReferenceSystem/CRSAnyProperties";

/**
 * Separates a geoJSON MultiPolygon features into multiple Polygon features, if it has any.
 * Each new polygon feature has the same {@link FeatureDocument.properties} as the original MultiPolygon feature.
 * @param  geoJSON - to separate MultiPolygon features.
 * @return separatedGeoJSON - geoJSON with the MultiPolygon features separated.
 */
export function separateMultiPolygons(geoJSON: GeoJSON<FeatureGeometryMultiPolygon | FeatureGeometryPolygon, CRSAnyProperties>) {

    let separatedGeoJSON: GeoJSON<FeatureGeometryPolygon, CRSAnyProperties> = {
        type: geoJSON.type,
        crs: geoJSON.crs,
        features: []
    };

    for (const currentFeature of geoJSON.features) {

        // If the feature is of the type Polygon, then simply append it to the separated geoJSON
        if (currentFeature.geometry.type === "Polygon") {

            let tempFeature: Feature<FeatureGeometryPolygon> = {

                type: currentFeature.type,
                properties: currentFeature.properties,
                geometry: {
                    type: "Polygon",
                    coordinates: currentFeature.geometry.coordinates,
                }

            }

            separatedGeoJSON.features.push(tempFeature);
        }

        // If the feature is of the type MultiPolygon, every Polygon in the MultiPolygon needs to be separated into a new feature
        else if (currentFeature.geometry.type === "MultiPolygon") {

            for (const polygon of currentFeature.geometry.coordinates) {

                let tempFeature: Feature<FeatureGeometryPolygon> = {

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

/**
 * Converts a feature's {@link coordinates} to Latitude/Longitude projection.
 * @param feature {@link Feature} to convert to Latitude/Longitude.
 * @param featureCRS {@link Feature} {@link CoordinatesReferenceSystem} to be used when converting.
 * @return The feature's {@link coordinates} in Latitude/Longitude.
 */
export function convertFeatureCoordinatesToLatLong(feature: Feature<FeatureGeometryPolygon>, featureProjection: string) {

    let convertedFeature: Feature<FeatureGeometryPolygon> = {
        type: feature.type,
        properties: feature.properties,
        // Weather isn't needed because it hasn't been calculated at the moment of conversion
        geometry: {
            type: feature.geometry.type,
            coordinates: []
        }
    }

    for (let region of feature.geometry.coordinates) {

        let convertedRegion: [][] = []

        for (let currentCoordinatePair of region) {

            let latitudeLongitudeProjection = "+proj=longlat +datum=WGS84 +no_defs"; // Latitude/Longitude projection
            convertedRegion.push(proj4(featureProjection, latitudeLongitudeProjection, currentCoordinatePair));

        }

        convertedFeature.geometry.coordinates.push(convertedRegion)

    }

    return convertedFeature;


}