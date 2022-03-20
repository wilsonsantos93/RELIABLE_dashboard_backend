import {FeatureProperties} from "./FeatureProperties";
import {ObjectId} from "mongodb";
import {FeatureCenter} from "./FeatureCenter";
import {FeatureGeometryPolygon} from "./FeatureGeometry/FeatureGeometryPolygon";
import {FeatureGeometryMultiPolygon} from "./FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureWeather} from "./FeatureWeather";

export interface Feature {
    _id?: ObjectId;
    type?: "Feature";
    properties?: FeatureProperties;
    geometry?: (FeatureGeometryMultiPolygon | FeatureGeometryPolygon);
    weather?: FeatureWeather;
    crsObjectId?: ObjectId;
    center?: FeatureCenter;
}