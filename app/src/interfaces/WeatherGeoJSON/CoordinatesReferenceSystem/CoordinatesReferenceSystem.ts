import {CoordinatesReferenceSystemProperties} from "./CoordinatesReferenceSystemProperties";

export interface CoordinatesReferenceSystem {
    type: string;
    properties: CoordinatesReferenceSystemProperties;
}