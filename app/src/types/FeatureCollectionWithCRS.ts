import {Feature, GeoJsonObject, GeoJsonProperties, Geometry} from "geojson";

export interface CRS {
    type: string;
    properties: {
        name: string;
    }
}

/**
 * Interface based on the FeatureCollection interface declared in the geojson package.
 */
export interface FeatureCollectionWithCRS<G extends Geometry | null = Geometry, P = GeoJsonProperties> extends GeoJsonObject {
    type: "FeatureCollection";
    features: Array<Feature<G, P>>;
    crs?: CRS
}