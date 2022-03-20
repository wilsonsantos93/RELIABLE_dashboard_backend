import {FeatureProperties} from "../GeoJSON/Feature/FeatureProperties";
import {ObjectId} from "mongodb";
import {FeatureCenter} from "../GeoJSON/Feature/FeatureCenter";
import {FeatureGeometryPolygon} from "../GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";
import {FeatureGeometryMultiPolygon} from "../GeoJSON/Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureWeather} from "../GeoJSON/Feature/FeatureWeather";
import {Feature} from "../GeoJSON/Feature";

export interface RegionBordersDocument {
    _id?: ObjectId;
    feature: Feature,
    crsObjectId?: ObjectId;
    center?: FeatureCenter;
}