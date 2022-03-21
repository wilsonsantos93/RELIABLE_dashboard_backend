import {ObjectId} from "mongodb";
import {FeatureCenter} from "../../GeoJSON/Feature/FeatureCenter";
import {Feature} from "../../GeoJSON/Feature";

export interface FeaturesProjection {
    _id?: number;
    feature?: number,
    center?: number;
}