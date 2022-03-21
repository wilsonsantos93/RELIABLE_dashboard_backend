import {CoordinatesReferenceSystemProperties} from "./CoordinatesReferenceSystem/CoordinatesReferenceSystemProperties";
import {ObjectId} from "mongodb";

export interface CoordinatesReferenceSystem {
    readonly type?: "name";
    readonly properties?: CoordinatesReferenceSystemProperties;
}