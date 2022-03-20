import {CoordinatesReferenceSystemProperties} from "./CoordinatesReferenceSystem/CoordinatesReferenceSystemProperties";

export interface CoordinatesReferenceSystem {
    type: string;
    properties: CoordinatesReferenceSystemProperties;
}