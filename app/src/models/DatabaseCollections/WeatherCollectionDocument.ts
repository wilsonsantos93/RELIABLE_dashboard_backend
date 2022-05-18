import {ObjectId} from "mongodb";
import {FeatureWeather} from "../FeatureProperties";

export interface WeatherCollectionDocument {
    _id: ObjectId;
    weather: FeatureWeather;
    weatherDateObjectId: ObjectId;
    regionBorderFeatureObjectId: ObjectId;
}

export interface WeatherCollectionDocumentWithFeature extends WeatherCollectionDocument {
    feature: any;
}