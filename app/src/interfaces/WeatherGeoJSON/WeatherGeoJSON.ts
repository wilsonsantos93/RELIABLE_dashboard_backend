import {CoordinatesReferenceSystem} from "./CoordinatesReferenceSystem/CoordinatesReferenceSystem";
import {Feature} from "./Feature/Feature";

declare module namespace {


    export interface WeatherGeoJSON {
        type: string;
        crs: CoordinatesReferenceSystem;
        features: Feature[];
    }

}

