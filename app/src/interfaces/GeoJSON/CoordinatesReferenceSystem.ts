import {CoordinatesReferenceSystemProperties} from "./CoordinatesReferenceSystem/CoordinatesReferenceSystemProperties";
import {ObjectId} from "mongodb";

export interface CoordinatesReferenceSystem {
    type?: "name";
    properties?: CoordinatesReferenceSystemProperties;
}