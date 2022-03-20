import {FeatureWeatherCurrent} from "./FeatureWeatherCurrent/FeatureWeatherCurrent";

export interface FeatureWeather {
    location: Location;
    current: FeatureWeatherCurrent;
}