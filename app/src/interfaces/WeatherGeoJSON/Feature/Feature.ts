import {FeatureProperties} from "./FeatureProperties";
import {FeatureGeometry} from "./FeatureGeometry";
import {FeatureWeather} from "./FeatureWeather/FeatureWeather";

export interface Feature {
    type: string;
    properties: FeatureProperties;
    geometry: FeatureGeometry;
    weather: FeatureWeather;
}