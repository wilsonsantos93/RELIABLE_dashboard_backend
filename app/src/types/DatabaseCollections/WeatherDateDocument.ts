import {ObjectId} from "mongodb";

export interface WeatherDateDocument {
    _id?: ObjectId;
    date: Date;
}