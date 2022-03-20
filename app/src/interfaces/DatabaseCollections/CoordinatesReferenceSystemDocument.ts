import {ObjectId} from "mongodb";
import {
    CoordinatesReferenceSystem
} from "../GeoJSON/CoordinatesReferenceSystem";

export interface CoordinatesReferenceSystemDocument {
    _id?: ObjectId;
    crs?: CoordinatesReferenceSystem,
    crsProjection?: string;
}