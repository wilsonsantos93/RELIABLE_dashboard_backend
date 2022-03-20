import {CoordinatesReferenceSystem} from "./CoordinatesReferenceSystem";
import {Feature} from "./Feature";


export interface GeoJSON {
    type?: "FeatureCollection";
    crs?: CoordinatesReferenceSystem;
    features: Feature[];
}

