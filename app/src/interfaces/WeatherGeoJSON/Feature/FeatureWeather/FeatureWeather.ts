import {FeatureWeatherLocation} from "./FeatureWeatherLocation";
import {FeatureWeatherCurrent} from "./FeatureWeatherCurrent/FeatureWeatherCurrent";

export interface FeatureWeather {
    location: FeatureWeatherLocation;
    current: FeatureWeatherCurrent;
}