import {ObjectId} from "mongodb";
import {FeatureWeather} from "../GeoJSON/Feature/FeatureWeather";

export interface WeatherCollectionDocument {
    _id: ObjectId;
    weather: FeatureWeather;
    weatherDateObjectId: ObjectId;
    regionBorderFeatureObjectId: ObjectId;
}