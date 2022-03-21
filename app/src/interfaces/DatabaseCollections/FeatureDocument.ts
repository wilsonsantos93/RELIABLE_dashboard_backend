import {ObjectId} from "mongodb";
import {FeatureCenter} from "../GeoJSON/Feature/FeatureCenter";
import {Feature} from "../GeoJSON/Feature";
import {FeatureGeometryMultiPolygon} from "../GeoJSON/Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureGeometryPolygon} from "../GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";

export interface FeatureDocument {
    _id?: ObjectId;
    feature: Feature<FeatureGeometryPolygon>,
    crsObjectId?: ObjectId;
    center?: FeatureCenter;
}