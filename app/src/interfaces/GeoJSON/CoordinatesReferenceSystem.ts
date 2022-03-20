import {CoordinatesReferenceSystemProperties} from "./CoordinatesReferenceSystem/CoordinatesReferenceSystemProperties";
import {ObjectId} from "mongodb";

export interface CoordinatesReferenceSystem {
    _id?: ObjectId;
    type?: "name";
    properties?: CoordinatesReferenceSystemProperties;
    crsProjection?: string;
}