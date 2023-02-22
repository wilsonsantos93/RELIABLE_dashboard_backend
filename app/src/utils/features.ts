// Takes a geoJSON, and returns another geoJSON with the MultiPolygon features separated into multiple features
// with a single Polygon each and the same properties of the MultiPolygon
import {FeatureDocument} from "../types/DatabaseCollections/FeatureDocument";
import proj4 from "proj4";
import fetch from "cross-fetch";
import {Feature, FeatureCollection, MultiPolygon, Polygon, Position} from "geojson";
import {FeatureProperties} from "../types/FeatureProperties";
import {CRS} from "../types/FeatureCollectionWithCRS";

/**
 * Requests and returns the projection information of a {@link CoordinatesReferenceSystem} from an external API.
 * @param crs The {@link CoordinatesReferenceSystem} to fetch the projection information.
 * @return The {@link CoordinatesReferenceSystem} information.
 */
export async function requestProjectionInformation(crs: CRS) {
    let projectionNumber = crs.properties.name.split("::")[1]; // The number of the EPSG projection, used to fetch the projection information from an external API
    let projectionInformationURL =
        "https://epsg.io/" + projectionNumber + ".proj4"; // The URL of the projection information
    const projectionResponse = await fetch(projectionInformationURL);
    let projectionInformation = await projectionResponse.text();

    return projectionInformation;
}

/**
 * Separates a geoJSON MultiPolygon features into multiple Polygon features, if it has any.
 * Each new polygon feature has the same {@link FeatureDocument.properties} as the original MultiPolygon feature.
 * @param  geoJSON - to separate MultiPolygon features.
 * @return separatedGeoJSON - geoJSON with the MultiPolygon features separated.
 */
export function separateMultiPolygons(geoJSON: FeatureCollection<MultiPolygon | Polygon, FeatureProperties> ) {

    let separatedGeoJSON: FeatureCollection<Polygon, FeatureProperties> = {
        type: geoJSON.type,
        features: []
    };

    for (const currentFeature of geoJSON.features) {

        // If the feature is of the type Polygon, then simply append it to the separated geoJSON
        if (currentFeature.geometry.type === "Polygon") {

            let tempFeature: Feature<Polygon, FeatureProperties> ={

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

                let tempFeature: Feature<Polygon, FeatureProperties> = {

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
export function convertFeatureCoordinatesToLatLong(feature: Feature<Polygon, FeatureProperties>, featureProjection: string) {

    let convertedFeature: Feature<Polygon, FeatureProperties> = {
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
            convertedRegion.push(proj4(featureProjection, latitudeLongitudeProjection, currentCoordinatePair as []));

        }

        convertedFeature.geometry.coordinates.push(convertedRegion)

    }

    return convertedFeature;
}