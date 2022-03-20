import {
    CoordinatesReferenceSystem
} from "./GeoJSON/CoordinatesReferenceSystem";
import {Feature} from "./GeoJSON/Feature";

export interface GeoJSON {
    type?: "FeatureCollection";
    crs?: CoordinatesReferenceSystem;
    features: Feature[];
}

