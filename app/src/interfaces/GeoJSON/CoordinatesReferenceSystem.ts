import {CRSAnyProperties} from "./CoordinatesReferenceSystem/CRSAnyProperties";
import {ObjectId} from "mongodb";
import {CRSLatLongProperties} from "./CoordinatesReferenceSystem/CRSLatLongProperties";

export interface CoordinatesReferenceSystem<TCRSProperties extends CRSAnyProperties | CRSLatLongProperties> {
    readonly type?: "name";
    readonly properties?: TCRSProperties;
}