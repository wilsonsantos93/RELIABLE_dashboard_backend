// Takes a geoJSON, and returns another geoJSON with the MultiPolygon features separated into multiple features
// with a single Polygon each and the same properties of the MultiPolygon
export function separateMultiPolygons(geoJSON) {

    let separatedGeoJSON = {};

    separatedGeoJSON.type = geoJSON.type;
    separatedGeoJSON.crs = geoJSON.crs;
    separatedGeoJSON.features = [];

    for (const currentFeature of geoJSON.features) {

        // If the feature is of the type Polygon, then simply append it to the separated geoJSON
        if (currentFeature.geometry.type === "Polygon") {
            separatedGeoJSON.features.push(currentFeature);
        }

        // If the feature is of the type MultiPolygon, every Polygon in the MultiPolygon needs to be separated into a new feature
        else if (currentFeature.geometry.type === "MultiPolygon") {

            for (const polygon of currentFeature.geometry.coordinates) {

                let tempFeature = {}

                tempFeature.type = currentFeature.type;
                tempFeature.properties = currentFeature.properties;
                tempFeature.geometry = {}
                tempFeature.geometry.type = "Polygon";
                tempFeature.geometry.coordinates = polygon;

                separatedGeoJSON.features.push(tempFeature);

            }

        }

    }

    return separatedGeoJSON;

}