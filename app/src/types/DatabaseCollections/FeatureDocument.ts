import {ObjectId} from "mongodb";
import {Feature, Polygon} from 'geojson'
import {FeatureProperties} from "../FeatureProperties";

interface FeatureCenter {
    type: "Point",
    coordinates: number[]
}

export interface FeatureDocument {
    _id?: ObjectId;
    feature: Feature<Polygon, FeatureProperties>,
    crsObjectId?: ObjectId;
    center?: FeatureCenter;
}