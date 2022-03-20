import {FeatureWeatherLocation} from "./FeatureWeather/FeatureWeatherLocation";
import {FeatureWeatherCurrent} from "./FeatureWeather/FeatureWeatherCurrent";

export interface FeatureWeather {
    location: FeatureWeatherLocation;
    current: FeatureWeatherCurrent;
}