import {CoordinatesReferenceSystem} from "./CoordinatesReferenceSystem";
import {Feature} from "./Feature/Feature";


export interface GeoJSON {
    type?: "FeatureCollection";
    crs?: CoordinatesReferenceSystem;
    features: Feature[];
}

